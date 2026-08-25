import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { XMLParser } from 'fast-xml-parser';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AwesomeQuote,
  BcbSerieItem,
  MarketMoedaDto,
  MarketNoticiaDto,
  MarketSummaryDto,
  MarketTaxaDto,
} from './market.types';

const SYNC_MAX_AGE_MS = 60 * 60 * 1000;
const AWESOME_PAIRS = 'USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL';
const AWESOME_URL = `https://economia.awesomeapi.com.br/json/last/${AWESOME_PAIRS}`;

const CURRENCY_META: Record<string, { nome: string; simbolo: string }> = {
  USD: { nome: 'Dólar americano', simbolo: 'US$' },
  EUR: { nome: 'Euro', simbolo: '€' },
  GBP: { nome: 'Libra esterlina', simbolo: '£' },
  BTC: { nome: 'Bitcoin', simbolo: '₿' },
  BRL: { nome: 'Real brasileiro', simbolo: 'R$' },
};

/** BCB SGS: 432 = Selic meta (% a.a.), 12 = CDI (% a.a.) */
const BCB_SERIES = [
  { codigo: 432, nome: 'SELIC' },
  { codigo: 12, nome: 'CDI' },
] as const;

const NEWS_FEEDS = [
  { url: 'https://www.infomoney.com.br/feed/', fonte: 'InfoMoney' },
  { url: 'https://www.moneytimes.com.br/feed/', fonte: 'Money Times' },
] as const;

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private syncing: Promise<void> | null = null;
  private lastLiveQuotes = new Map<
    string,
    { pctChange: number | null; high: number | null; low: number | null }
  >();
  private newsCache: { items: MarketNoticiaDto[]; fetchedAt: number } | null = null;
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<MarketSummaryDto> {
    await this.ensureFreshData();

    const [moedasDb, taxasDb, noticias] = await Promise.all([
      this.prisma.moeda.findMany({
        where: { codigo: { in: ['USD', 'EUR', 'GBP', 'BTC'] } },
        orderBy: { codigo: 'asc' },
      }),
      this.prisma.taxa.findMany({
        where: { nome: { in: ['SELIC', 'CDI', 'CDB'] } },
        orderBy: { nome: 'asc' },
      }),
      this.fetchNews(),
    ]);

    const moedas: MarketMoedaDto[] = moedasDb.map((m) => {
      const live = this.lastLiveQuotes.get(m.codigo);
      return {
        codigo: m.codigo,
        nome: m.nome,
        simbolo: m.simbolo,
        taxaParaReal: Number(m.taxaParaReal),
        pctChange: live?.pctChange ?? null,
        high: live?.high ?? null,
        low: live?.low ?? null,
        dataAtualizacao: m.dataAtualizacao.toISOString(),
      };
    });

    const taxas: MarketTaxaDto[] = taxasDb.map((t) => ({
      nome: t.nome,
      valorPercentual: Number(t.valorPercentual),
      fonte: t.fonte,
      dataAtualizacao: t.dataAtualizacao.toISOString(),
      referencia: t.nome === 'CDB' || t.fonte === 'referencia',
    }));

    return {
      moedas,
      taxas,
      noticias,
      atualizadoEm: new Date().toISOString(),
    };
  }

  @Cron('0 * * * *')
  async scheduledSync(): Promise<void> {
    try {
      await this.syncAll();
      this.logger.log('Market data synced (cron)');
    } catch (error) {
      this.logger.warn(`Market cron sync failed: ${String(error)}`);
    }
  }

  private async ensureFreshData(): Promise<void> {
    const stale = await this.isStale();
    if (!stale) return;
    try {
      await this.syncAll();
    } catch (error) {
      this.logger.warn(`Lazy market sync failed: ${String(error)}`);
    }
  }

  private async isStale(): Promise<boolean> {
    const latest = await this.prisma.moeda.findFirst({
      where: { codigo: { in: ['USD', 'EUR', 'GBP', 'BTC'] } },
      orderBy: { dataAtualizacao: 'desc' },
      select: { dataAtualizacao: true },
    });
    if (!latest) return true;
    return Date.now() - latest.dataAtualizacao.getTime() > SYNC_MAX_AGE_MS;
  }

  private async syncAll(): Promise<void> {
    if (this.syncing) return this.syncing;
    this.syncing = (async () => {
      await this.ensureBrl();
      await Promise.all([this.syncMoedas(), this.syncTaxas()]);
    })().finally(() => {
      this.syncing = null;
    });
    return this.syncing;
  }

  private async ensureBrl(): Promise<void> {
    await this.prisma.moeda.upsert({
      where: { codigo: 'BRL' },
      create: {
        codigo: 'BRL',
        nome: CURRENCY_META.BRL.nome,
        simbolo: CURRENCY_META.BRL.simbolo,
        taxaParaReal: 1,
      },
      update: {},
    });
  }

  private async syncMoedas(): Promise<void> {
    try {
      const response = await fetch(AWESOME_URL, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) {
        throw new Error(`AwesomeAPI HTTP ${response.status}`);
      }

      const payload = (await response.json()) as Record<string, AwesomeQuote>;
      const now = new Date();

      for (const quote of Object.values(payload)) {
        const codigo = quote.code?.toUpperCase();
        if (!codigo || !CURRENCY_META[codigo]) continue;

        const bid = Number(quote.bid);
        if (!Number.isFinite(bid) || bid <= 0) continue;

        const meta = CURRENCY_META[codigo];
        const pctChange = quote.pctChange != null ? Number(quote.pctChange) : null;
        const high = quote.high != null ? Number(quote.high) : null;
        const low = quote.low != null ? Number(quote.low) : null;

        this.lastLiveQuotes.set(codigo, {
          pctChange: Number.isFinite(pctChange) ? pctChange : null,
          high: Number.isFinite(high) ? high : null,
          low: Number.isFinite(low) ? low : null,
        });

        await this.prisma.moeda.upsert({
          where: { codigo },
          create: {
            codigo,
            nome: meta.nome,
            simbolo: meta.simbolo,
            taxaParaReal: bid,
            dataAtualizacao: now,
          },
          update: {
            nome: meta.nome,
            simbolo: meta.simbolo,
            taxaParaReal: bid,
            dataAtualizacao: now,
          },
        });
      }
    } catch (error) {
      this.logger.warn(`AwesomeAPI sync failed: ${String(error)}`);
    }
  }

  private async syncTaxas(): Promise<void> {
    const brl = await this.prisma.moeda.findUnique({ where: { codigo: 'BRL' } });
    if (!brl) return;

    let cdiValue: number | null = null;
    const now = new Date();

    for (const serie of BCB_SERIES) {
      const valor = await this.fetchBcbSerie(serie.codigo);
      if (valor == null) continue;
      if (serie.nome === 'CDI') cdiValue = valor;

      await this.upsertTaxa({
        idMoeda: brl.id,
        nome: serie.nome,
        valorPercentual: valor,
        fonte: 'BCB',
        dataAtualizacao: now,
      });
    }

    if (cdiValue != null) {
      await this.upsertTaxa({
        idMoeda: brl.id,
        nome: 'CDB',
        valorPercentual: cdiValue,
        fonte: 'referencia',
        dataAtualizacao: now,
      });
    }
  }

  private async fetchBcbSerie(codigo: number): Promise<number | null> {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/1?formato=json`;
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) {
        this.logger.warn(`BCB serie ${codigo} HTTP ${response.status}`);
        return null;
      }
      const data = (await response.json()) as BcbSerieItem[];
      const raw = data[0]?.valor?.replace(',', '.');
      const valor = raw != null ? Number(raw) : NaN;
      return Number.isFinite(valor) ? valor : null;
    } catch (error) {
      this.logger.warn(`BCB serie ${codigo} failed: ${String(error)}`);
      return null;
    }
  }

  private async upsertTaxa(input: {
    idMoeda: string;
    nome: string;
    valorPercentual: number;
    fonte: string;
    dataAtualizacao: Date;
  }): Promise<void> {
    const existing = await this.prisma.taxa.findFirst({
      where: { idMoeda: input.idMoeda, nome: input.nome },
    });

    if (existing) {
      await this.prisma.taxa.update({
        where: { id: existing.id },
        data: {
          valorPercentual: input.valorPercentual,
          fonte: input.fonte,
          dataAtualizacao: input.dataAtualizacao,
        },
      });
      return;
    }

    await this.prisma.taxa.create({
      data: {
        idMoeda: input.idMoeda,
        nome: input.nome,
        valorPercentual: input.valorPercentual,
        fonte: input.fonte,
        dataAtualizacao: input.dataAtualizacao,
      },
    });
  }

  private async fetchNews(): Promise<MarketNoticiaDto[]> {
    if (this.newsCache && Date.now() - this.newsCache.fetchedAt < 15 * 60 * 1000) {
      return this.newsCache.items;
    }

    const collected: MarketNoticiaDto[] = [];

    for (const feed of NEWS_FEEDS) {
      try {
        const items = await this.parseRssFeed(feed.url, feed.fonte);
        collected.push(...items);
      } catch (error) {
        this.logger.warn(`RSS ${feed.fonte} failed: ${String(error)}`);
      }
    }

    const unique = new Map<string, MarketNoticiaDto>();
    for (const item of collected) {
      if (!unique.has(item.url)) unique.set(item.url, item);
    }

    const items = [...unique.values()]
      .sort((a, b) => {
        const da = a.dataPublicacao ? Date.parse(a.dataPublicacao) : 0;
        const db = b.dataPublicacao ? Date.parse(b.dataPublicacao) : 0;
        return db - da;
      })
      .slice(0, 8);

    this.newsCache = { items, fetchedAt: Date.now() };
    return items;
  }

  private async parseRssFeed(url: string, fonte: string): Promise<MarketNoticiaDto[]> {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'ValoraMarketBot/1.0',
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    const parsed = this.xmlParser.parse(xml) as {
      rss?: { channel?: { item?: unknown } };
      feed?: { entry?: unknown };
    };

    const channelItems = parsed.rss?.channel?.item;
    const atomEntries = parsed.feed?.entry;
    const rawItems = channelItems ?? atomEntries ?? [];
    const list = Array.isArray(rawItems) ? rawItems : [rawItems];

    return list
      .map((raw) => this.mapRssItem(raw as Record<string, unknown>, fonte))
      .filter((item): item is MarketNoticiaDto => item != null);
  }

  private mapRssItem(raw: Record<string, unknown>, fonte: string): MarketNoticiaDto | null {
    const titulo = this.asString(raw.title) ?? this.asString((raw.title as { '#text'?: string })?.['#text']);
    const linkField = raw.link;
    let url: string | null = null;
    if (typeof linkField === 'string') {
      url = linkField;
    } else if (linkField && typeof linkField === 'object') {
      const linkObj = linkField as { '@_href'?: string; '#text'?: string };
      url = linkObj['@_href'] ?? linkObj['#text'] ?? null;
    }
    if (!url) url = this.asString(raw.guid);

    if (!titulo || !url) return null;

    const pub =
      this.asString(raw.pubDate) ??
      this.asString(raw.published) ??
      this.asString(raw.updated) ??
      null;
    let dataPublicacao: string | null = null;
    if (pub) {
      const parsed = Date.parse(pub);
      dataPublicacao = Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
    }

    const description =
      this.asString(raw.description) ??
      this.asString(raw.summary) ??
      this.asString((raw['content:encoded'] as string | undefined) ?? undefined);

    return {
      titulo: this.stripHtml(titulo).trim(),
      url: url.trim(),
      fonte,
      dataPublicacao,
      resumo: description ? this.stripHtml(description).trim().slice(0, 220) : null,
    };
  }

  private asString(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && '#text' in value) {
      const text = (value as { '#text'?: unknown })['#text'];
      return typeof text === 'string' ? text : null;
    }
    return null;
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  }
}
