import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { XMLParser } from 'fast-xml-parser';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AwesomeQuote,
  BcbSerieItem,
  CoinGeckoPriceMap,
  MarketEducacaoExtrasDto,
  MarketMoedaDto,
  MarketNoticiaDto,
  MarketSummaryDto,
  MarketTaxaDto,
  MarketTesouroTituloDto,
  MarketTickerDto,
} from './market.types';

const SYNC_MAX_AGE_MS = 60 * 60 * 1000;
const LIVE_QUOTES_TTL_MS = 2 * 60 * 1000;
const EDUCACAO_EXTRAS_TTL_MS = 30 * 60 * 1000;

const FIAT_META: Record<string, { nome: string; simbolo: string }> = {
  USD: { nome: 'Dólar americano', simbolo: 'US$' },
  EUR: { nome: 'Euro', simbolo: '€' },
  GBP: { nome: 'Libra esterlina', simbolo: '£' },
  CAD: { nome: 'Dólar canadense', simbolo: 'C$' },
  AUD: { nome: 'Dólar australiano', simbolo: 'A$' },
  CHF: { nome: 'Franco suíço', simbolo: 'CHF' },
  JPY: { nome: 'Iene japonês', simbolo: '¥' },
  CNY: { nome: 'Yuan chinês', simbolo: '¥' },
  ARS: { nome: 'Peso argentino', simbolo: 'AR$' },
  MXN: { nome: 'Peso mexicano', simbolo: 'MX$' },
  CLP: { nome: 'Peso chileno', simbolo: 'CL$' },
  PEN: { nome: 'Sol peruano', simbolo: 'S/' },
};

const CRYPTO_META = [
  { id: 'bitcoin', codigo: 'BTC', nome: 'Bitcoin', simbolo: '₿' },
  { id: 'ethereum', codigo: 'ETH', nome: 'Ethereum', simbolo: 'Ξ' },
  { id: 'solana', codigo: 'SOL', nome: 'Solana', simbolo: 'SOL' },
  { id: 'ripple', codigo: 'XRP', nome: 'XRP', simbolo: 'XRP' },
  { id: 'cardano', codigo: 'ADA', nome: 'Cardano', simbolo: 'ADA' },
  { id: 'dogecoin', codigo: 'DOGE', nome: 'Dogecoin', simbolo: 'Ð' },
  { id: 'binancecoin', codigo: 'BNB', nome: 'BNB', simbolo: 'BNB' },
  { id: 'polkadot', codigo: 'DOT', nome: 'Polkadot', simbolo: 'DOT' },
] as const;

const FIAT_CODES = Object.keys(FIAT_META);
const CRYPTO_CODES: string[] = CRYPTO_META.map((c) => c.codigo);
const MARKET_CODES = [...FIAT_CODES, ...CRYPTO_CODES];
const AWESOME_PAIRS = FIAT_CODES.map((c) => `${c}-BRL`).join(',');
const AWESOME_URL = `https://economia.awesomeapi.com.br/json/last/${AWESOME_PAIRS}`;
const COINGECKO_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${CRYPTO_META.map((c) => c.id).join(',')}&vs_currencies=brl&include_24hr_change=true`;

/** BCB SGS — fontes: api.bcb.gov.br */
const BCB_SERIES = [
  { codigo: 432, nome: 'SELIC', periodo: 'aa' as const },
  { codigo: 12, nome: 'CDI', periodo: 'aa' as const },
  { codigo: 433, nome: 'IPCA', periodo: 'mensal' as const },
  { codigo: 189, nome: 'IGPM', periodo: 'mensal' as const },
  { codigo: 196, nome: 'POUPANCA', periodo: 'mensal' as const },
] as const;

const TAXA_NAMES = [...BCB_SERIES.map((s) => s.nome), 'CDB'];

const EDUCATIONAL_TICKERS = ['PETR4', 'VALE3', 'ITUB4', 'BOVA11'] as const;

const NEWS_FEEDS = [
  { url: 'https://www.infomoney.com.br/feed/', fonte: 'InfoMoney' },
  { url: 'https://www.moneytimes.com.br/feed/', fonte: 'Money Times' },
] as const;

const TESOURO_JSON_URL =
  'https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private syncing: Promise<void> | null = null;
  private lastLiveQuotes = new Map<
    string,
    { pctChange: number | null; high: number | null; low: number | null }
  >();
  private newsCache: { items: MarketNoticiaDto[]; fetchedAt: number } | null = null;
  private liveQuotesFetchedAt = 0;
  private educacaoExtrasCache: { data: MarketEducacaoExtrasDto; fetchedAt: number } | null = null;
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getSummary(): Promise<MarketSummaryDto> {
    await this.ensureFreshData();
    await this.ensureLiveQuotes();

    const [moedasDb, taxasDb, noticias] = await Promise.all([
      this.prisma.moeda.findMany({
        where: { codigo: { in: MARKET_CODES } },
        orderBy: { codigo: 'asc' },
      }),
      this.prisma.taxa.findMany({
        where: { nome: { in: TAXA_NAMES } },
        orderBy: { nome: 'asc' },
      }),
      this.fetchNews(),
    ]);

    const mapMoeda = (m: (typeof moedasDb)[number]): MarketMoedaDto => {
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
    };

    const taxas: MarketTaxaDto[] = taxasDb.map((t) => ({
      nome: t.nome,
      valorPercentual: Number(t.valorPercentual),
      fonte: t.fonte,
      dataAtualizacao: t.dataAtualizacao.toISOString(),
      referencia: t.nome === 'CDB' || t.fonte === 'referencia',
      periodo: this.taxaPeriodo(t.nome),
    }));

    return {
      cambio: {
        moedas: this.sortMoedas(
          moedasDb.filter((m) => FIAT_CODES.includes(m.codigo)).map(mapMoeda),
          FIAT_CODES,
        ),
      },
      cripto: {
        moedas: this.sortMoedas(
          moedasDb.filter((m) => CRYPTO_CODES.includes(m.codigo)).map(mapMoeda),
          CRYPTO_CODES,
        ),
      },
      taxas: { taxas: this.sortTaxas(taxas) },
      noticias,
      atualizadoEm: new Date().toISOString(),
    };
  }

  async getEducacaoExtras(): Promise<MarketEducacaoExtrasDto> {
    if (
      this.educacaoExtrasCache &&
      Date.now() - this.educacaoExtrasCache.fetchedAt < EDUCACAO_EXTRAS_TTL_MS
    ) {
      return this.educacaoExtrasCache.data;
    }

    const [tickers, tesouro] = await Promise.all([
      this.fetchEducationalTickers(),
      this.fetchTesouroTitulos(),
    ]);

    const data: MarketEducacaoExtrasDto = {
      tickers,
      tesouro,
      atualizadoEm: new Date().toISOString(),
    };
    this.educacaoExtrasCache = { data, fetchedAt: Date.now() };
    return data;
  }

  async getTaxaByNome(nome: string): Promise<MarketTaxaDto | null> {
    await this.ensureFreshData();
    const taxa = await this.prisma.taxa.findFirst({
      where: { nome: nome.toUpperCase() },
      orderBy: { dataAtualizacao: 'desc' },
    });
    if (!taxa) return null;
    return {
      nome: taxa.nome,
      valorPercentual: Number(taxa.valorPercentual),
      fonte: taxa.fonte,
      dataAtualizacao: taxa.dataAtualizacao.toISOString(),
      referencia: taxa.nome === 'CDB' || taxa.fonte === 'referencia',
      periodo: this.taxaPeriodo(taxa.nome),
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

  private taxaPeriodo(nome: string): 'aa' | 'mensal' {
    const serie = BCB_SERIES.find((s) => s.nome === nome);
    return serie?.periodo ?? 'aa';
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
    const [latest, count] = await Promise.all([
      this.prisma.moeda.findFirst({
        where: { codigo: { in: MARKET_CODES } },
        orderBy: { dataAtualizacao: 'desc' },
        select: { dataAtualizacao: true },
      }),
      this.prisma.moeda.count({
        where: { codigo: { in: MARKET_CODES } },
      }),
    ]);

    if (!latest || count < MARKET_CODES.length) return true;
    return Date.now() - latest.dataAtualizacao.getTime() > SYNC_MAX_AGE_MS;
  }

  private async syncAll(): Promise<void> {
    if (this.syncing) return this.syncing;
    this.syncing = (async () => {
      await this.ensureBrl();
      await Promise.all([this.syncFiatMoedas(), this.syncCryptoMoedas(), this.syncTaxas()]);
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
        nome: 'Real brasileiro',
        simbolo: 'R$',
        taxaParaReal: 1,
      },
      update: {},
    });
  }

  private sortMoedas(moedas: MarketMoedaDto[], order: readonly string[]): MarketMoedaDto[] {
    const rank = new Map(order.map((code, index) => [code, index]));
    return [...moedas].sort(
      (a, b) =>
        (rank.get(a.codigo) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.codigo) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  private sortTaxas(taxas: MarketTaxaDto[]): MarketTaxaDto[] {
    const rank = new Map(TAXA_NAMES.map((nome, index) => [nome, index]));
    return [...taxas].sort(
      (a, b) =>
        (rank.get(a.nome) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.nome) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  private async ensureLiveQuotes(): Promise<void> {
    const fresh =
      this.lastLiveQuotes.size > 0 && Date.now() - this.liveQuotesFetchedAt < LIVE_QUOTES_TTL_MS;
    if (fresh) return;
    await Promise.all([this.fetchFiatLiveQuotes(), this.fetchCryptoLiveQuotes()]);
    this.liveQuotesFetchedAt = Date.now();
  }

  private async fetchFiatLiveQuotes(): Promise<void> {
    try {
      const response = await fetch(AWESOME_URL, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) return;
      this.applyAwesomeQuotes((await response.json()) as Record<string, AwesomeQuote>);
    } catch (error) {
      this.logger.warn(`Fiat live quotes failed: ${String(error)}`);
    }
  }

  private async fetchCryptoLiveQuotes(): Promise<void> {
    try {
      const response = await fetch(COINGECKO_URL, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) return;
      this.applyCoinGeckoPrices((await response.json()) as CoinGeckoPriceMap);
    } catch (error) {
      this.logger.warn(`Crypto live quotes failed: ${String(error)}`);
    }
  }

  private applyAwesomeQuotes(payload: Record<string, AwesomeQuote>): void {
    for (const quote of Object.values(payload)) {
      const codigo = quote.code?.toUpperCase();
      if (!codigo || !FIAT_META[codigo]) continue;

      const pctChange = quote.pctChange != null ? Number(quote.pctChange) : null;
      const high = quote.high != null ? Number(quote.high) : null;
      const low = quote.low != null ? Number(quote.low) : null;

      this.lastLiveQuotes.set(codigo, {
        pctChange: Number.isFinite(pctChange) ? pctChange : null,
        high: Number.isFinite(high) ? high : null,
        low: Number.isFinite(low) ? low : null,
      });
    }
  }

  private applyCoinGeckoPrices(payload: CoinGeckoPriceMap): void {
    for (const asset of CRYPTO_META) {
      const price = payload[asset.id];
      if (!price?.brl) continue;

      const pctChange = price.brl_24h_change != null ? Number(price.brl_24h_change) : null;
      this.lastLiveQuotes.set(asset.codigo, {
        pctChange: Number.isFinite(pctChange) ? pctChange : null,
        high: null,
        low: null,
      });
    }
  }

  private async syncFiatMoedas(): Promise<void> {
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
      this.applyAwesomeQuotes(payload);

      for (const quote of Object.values(payload)) {
        const codigo = quote.code?.toUpperCase();
        if (!codigo || !FIAT_META[codigo]) continue;

        const bid = Number(quote.bid);
        if (!Number.isFinite(bid) || bid <= 0) continue;

        const meta = FIAT_META[codigo];
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

  private async syncCryptoMoedas(): Promise<void> {
    try {
      const response = await fetch(COINGECKO_URL, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) {
        throw new Error(`CoinGecko HTTP ${response.status}`);
      }

      const payload = (await response.json()) as CoinGeckoPriceMap;
      const now = new Date();
      this.applyCoinGeckoPrices(payload);

      for (const asset of CRYPTO_META) {
        const price = payload[asset.id];
        if (!price?.brl || price.brl <= 0) continue;

        await this.prisma.moeda.upsert({
          where: { codigo: asset.codigo },
          create: {
            codigo: asset.codigo,
            nome: asset.nome,
            simbolo: asset.simbolo,
            taxaParaReal: price.brl,
            dataAtualizacao: now,
          },
          update: {
            nome: asset.nome,
            simbolo: asset.simbolo,
            taxaParaReal: price.brl,
            dataAtualizacao: now,
          },
        });
      }
    } catch (error) {
      this.logger.warn(`CoinGecko sync failed: ${String(error)}`);
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

  private async fetchEducationalTickers(): Promise<MarketTickerDto[]> {
    const token = this.config.get<string>('BRAPI_TOKEN');
    const results: MarketTickerDto[] = [];

    for (const symbol of EDUCATIONAL_TICKERS) {
      try {
        const url = new URL(`https://brapi.dev/api/quote/${symbol}`);
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) {
          this.logger.warn(`BrAPI ${symbol} HTTP ${response.status}`);
          continue;
        }

        const payload = (await response.json()) as {
          results?: Array<{
            symbol?: string;
            shortName?: string;
            currency?: string;
            regularMarketPrice?: number;
            regularMarketChangePercent?: number;
          }>;
        };
        const item = payload.results?.[0];
        if (!item) continue;

        results.push({
          symbol: item.symbol ?? symbol,
          shortName: item.shortName ?? null,
          currency: item.currency ?? 'BRL',
          regularMarketPrice:
            item.regularMarketPrice != null && Number.isFinite(item.regularMarketPrice)
              ? item.regularMarketPrice
              : null,
          regularMarketChangePercent:
            item.regularMarketChangePercent != null &&
            Number.isFinite(item.regularMarketChangePercent)
              ? item.regularMarketChangePercent
              : null,
          fonte: 'brapi.dev',
        });
      } catch (error) {
        this.logger.warn(`BrAPI ${symbol} failed: ${String(error)}`);
      }
    }

    return results;
  }

  private async fetchTesouroTitulos(): Promise<MarketTesouroTituloDto[]> {
    try {
      const response = await fetch(TESOURO_JSON_URL, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ValoraMarketBot/1.0',
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        this.logger.warn(`Tesouro Direto HTTP ${response.status}`);
        return [];
      }

      const payload = (await response.json()) as {
        response?: {
          TrsrBdTradgList?: Array<{
            TrsrBd?: {
              nm?: string;
              featrs?: string;
              mtrtyDt?: string;
              untrRedVal?: number;
              minInvstmtAmt?: number;
              anulInvstmtRate?: number;
              anulRedRate?: number;
            };
          }>;
        };
      };

      const list = payload.response?.TrsrBdTradgList ?? [];
      return list
        .map((entry): MarketTesouroTituloDto | null => {
          const bond = entry.TrsrBd;
          if (!bond?.nm) return null;
          return {
            nome: bond.nm,
            tipoTitulo: bond.featrs ?? null,
            vencimento: bond.mtrtyDt ?? null,
            taxaCompra:
              bond.anulInvstmtRate != null && Number.isFinite(bond.anulInvstmtRate)
                ? bond.anulInvstmtRate
                : null,
            taxaVenda:
              bond.anulRedRate != null && Number.isFinite(bond.anulRedRate)
                ? bond.anulRedRate
                : null,
            puCompra:
              bond.minInvstmtAmt != null && Number.isFinite(bond.minInvstmtAmt)
                ? bond.minInvstmtAmt
                : null,
            puVenda:
              bond.untrRedVal != null && Number.isFinite(bond.untrRedVal) ? bond.untrRedVal : null,
            fonte: 'Tesouro Direto',
          };
        })
        .filter((item): item is MarketTesouroTituloDto => item != null)
        .slice(0, 8);
    } catch (error) {
      this.logger.warn(`Tesouro Direto failed: ${String(error)}`);
      return [];
    }
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
    const titulo =
      this.asString(raw.title) ?? this.asString((raw.title as { '#text'?: string })?.['#text']);
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
