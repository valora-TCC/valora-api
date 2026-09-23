import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../prisma/client';
import type { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { BelvoClient } from './belvo/belvo.client';
import { BelvoApiError } from './belvo/belvo.types';
import { CategorizationService } from './categorization/categorization.service';
import {
  buildPedroDemoPlanning,
  buildPedroDemoProfile,
  CREDIT_CARD_CATEGORY_HINT,
  DEMO_ALLOWED_CPF,
  DEMO_IDENTITY_ERROR,
  DEMO_INVESTMENT_TICKER_PREFIX,
  DEMO_PLANNING_TAG,
  isAllowedDemoIdentity,
} from './demo-pedro-profile';
import { CreateConnectionDto, DemoConnectDto, WidgetTokenDto } from './dto/open-finance.dto';
import { DISPLAY_BANK_NAME, displayInstitutionName } from './institution-display';
import { OpenFinanceSyncService } from './open-finance-sync.service';
import { upsertOpenFinanceCarteira } from './upsert-carteira';

const DEMO_LINK_PREFIX = 'demo-';
const DEMO_INSTITUTION = DISPLAY_BANK_NAME;

@Injectable()
export class OpenFinanceService {
  private readonly logger = new Logger(OpenFinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly belvo: BelvoClient,
    private readonly syncService: OpenFinanceSyncService,
    private readonly categorization: CategorizationService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async createWidgetToken(userId: string, email: string | undefined, dto: WidgetTokenDto) {
    const user = await this.usersService.getOrCreateMe(userId, email);
    const cpf = this.normalizeCpf(dto.cpf);
    const fullName = (dto.fullName?.trim() || user.nome || 'Usuario').slice(0, 120);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { cpf, ...(dto.fullName?.trim() ? { nome: fullName } : {}) },
    });

    try {
      const tokens = await this.belvo.createWidgetAccessToken({ cpf, fullName });
      return {
        access: tokens.access,
        environment: this.belvo.runtime.env,
        widgetUrl: this.buildWidgetUrl(tokens.access),
      };
    } catch (error) {
      this.rethrowBelvo(error);
    }
  }

  listConnections(userId: string) {
    return this.prisma.conexaoOpenFinance.findMany({
      where: { idUsuario: userId, status: { not: 'DISCONNECTED' } },
      orderBy: { dataCriacao: 'desc' },
      include: {
        carteiras: {
          where: { ativo: true },
          select: {
            id: true,
            nome: true,
            saldoAtual: true,
            instituicaoOf: true,
            tipoContaOf: true,
            moedaOf: true,
            idContaExterna: true,
          },
        },
      },
    });
  }

  async createConnection(userId: string, dto: CreateConnectionDto) {
    await this.usersService.getOrCreateMe(userId);
    const instituicao = displayInstitutionName(dto.institution);

    const existing = await this.prisma.conexaoOpenFinance.findUnique({
      where: { belvoLinkId: dto.belvoLinkId },
    });
    if (existing) {
      if (existing.idUsuario !== userId) {
        throw new ConflictException('Este Link Belvo já está associado a outro usuário');
      }
      if (existing.status === 'DISCONNECTED') {
        return this.prisma.conexaoOpenFinance.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            instituicao,
            ultimoErro: null,
          },
        });
      }
      return existing;
    }

    return this.prisma.conexaoOpenFinance.create({
      data: {
        idUsuario: userId,
        belvoLinkId: dto.belvoLinkId,
        instituicao,
        status: 'PENDING',
      },
    });
  }

  async disconnect(userId: string, connectionId: string) {
    const conexao = await this.findOwnedConnection(userId, connectionId);

    if (!conexao.belvoLinkId.startsWith(DEMO_LINK_PREFIX)) {
      try {
        await this.belvo.deleteLink(conexao.belvoLinkId);
      } catch (error) {
        this.logger.warn(`Belvo delete link failed for connection ${connectionId}`);
        if (!(error instanceof BelvoApiError && error.statusCode === 404)) {
          this.logger.warn('Continuing with local disconnect');
        }
      }
    }

    await this.purgeOpenFinanceLedger(userId, conexao.id);

    return this.prisma.conexaoOpenFinance.update({
      where: { id: conexao.id },
      data: { status: 'DISCONNECTED', ultimoErro: null },
    });
  }

  /**
   * Sandbox Open Finance connect: only Pedro's identity; seeds Nubank checking + credit card.
   */
  async seedDemo(userId: string, email: string | undefined, dto: DemoConnectDto) {
    if (!this.isDemoEnabled()) {
      throw new ServiceUnavailableException('Conexão Open Finance indisponível no momento.');
    }

    await this.usersService.getOrCreateMe(userId, email);
    const cpf = this.normalizeCpf(dto.cpf);
    const fullName = dto.fullName.trim().slice(0, 120);

    if (!isAllowedDemoIdentity(cpf, fullName)) {
      throw new ForbiddenException(DEMO_IDENTITY_ERROR);
    }

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { cpf, nome: fullName },
    });

    // One active sandbox connection per user — replace previous sample data.
    const existingActive = await this.prisma.conexaoOpenFinance.findMany({
      where: {
        idUsuario: userId,
        belvoLinkId: { startsWith: DEMO_LINK_PREFIX },
        status: { not: 'DISCONNECTED' },
      },
      select: { id: true },
    });
    for (const conn of existingActive) {
      await this.purgeOpenFinanceLedger(userId, conn.id);
      await this.prisma.conexaoOpenFinance.update({
        where: { id: conn.id },
        data: { status: 'DISCONNECTED', ultimoErro: null },
      });
    }

    const belvoLinkId = `${DEMO_LINK_PREFIX}${DEMO_ALLOWED_CPF}`;
    let conexao = await this.prisma.conexaoOpenFinance.findUnique({
      where: { belvoLinkId },
    });

    if (conexao) {
      if (conexao.idUsuario !== userId) {
        throw new ConflictException('Este CPF já está associado a outra conta Valora');
      }
      await this.purgeOpenFinanceLedger(userId, conexao.id);
      conexao = await this.prisma.conexaoOpenFinance.update({
        where: { id: conexao.id },
        data: {
          status: 'ACTIVE',
          instituicao: DEMO_INSTITUTION,
          ultimoErro: null,
          ultimaSincronizacao: new Date(),
        },
      });
    } else {
      conexao = await this.prisma.conexaoOpenFinance.create({
        data: {
          idUsuario: userId,
          belvoLinkId,
          instituicao: DEMO_INSTITUTION,
          status: 'ACTIVE',
          ultimaSincronizacao: new Date(),
        },
      });
    }

    return this.applyPedroDemoLedger(userId, conexao.id);
  }

  /**
   * Replaces the sandbox ledger with the current Pedro demo profile
   * (used by connect and by Sincronizar).
   */
  private async applyPedroDemoLedger(userId: string, connectionId: string) {
    const profile = buildPedroDemoProfile();
    const checkingExt = `demo-acc-checking-${DEMO_ALLOWED_CPF}`;
    const creditExt = `demo-acc-credit-${DEMO_ALLOWED_CPF}`;

    const checking = await upsertOpenFinanceCarteira(this.prisma, {
      userId,
      connectionId,
      idContaExterna: checkingExt,
      nome: 'Conta Corrente',
      descricao: `Open Finance · ${DEMO_INSTITUTION}`,
      instituicaoOf: DEMO_INSTITUTION,
      tipoContaOf: 'checking',
      moedaOf: 'BRL',
      saldoAtual: profile.checkingBalance,
    });
    const creditCard = await upsertOpenFinanceCarteira(this.prisma, {
      userId,
      connectionId,
      idContaExterna: creditExt,
      nome: 'Cartão de Crédito',
      descricao: `Open Finance · ${DEMO_INSTITUTION} · Fatura aberta`,
      instituicaoOf: DEMO_INSTITUTION,
      tipoContaOf: 'credit_card',
      moedaOf: 'BRL',
      saldoAtual: profile.creditCardBalance,
    });

    let transactionsImported = 0;
    const transactionsSkipped = 0;

    for (const [index, tx] of profile.transactions.entries()) {
      const idExterno = `demo-tx-${DEMO_ALLOWED_CPF}-${index + 1}`;
      const categorySource =
        tx.account === 'credit_card' ? CREDIT_CARD_CATEGORY_HINT : tx.descricao;
      const idCategoria = await this.categorization.resolveCategoryId(
        userId,
        categorySource,
        tx.tipo,
      );
      const dataTransacao = new Date(`${tx.date}T15:00:00.000Z`);

      await this.prisma.transacao.create({
        data: {
          idCarteira: tx.account === 'checking' ? checking.id : creditCard.id,
          idCategoria,
          tipo: tx.tipo,
          valor: new Prisma.Decimal(tx.valor.toFixed(2)),
          descricao: tx.descricao,
          dataTransacao,
          origem: 'OPEN_FINANCE',
          idExterno,
          provedor: 'BELVO',
        },
      });
      transactionsImported += 1;
    }

    const planning = await this.applyPedroDemoPlanning(userId);

    const updated = await this.prisma.conexaoOpenFinance.update({
      where: { id: connectionId },
      data: {
        status: 'ACTIVE',
        ultimaSincronizacao: new Date(),
        ultimoErro: null,
        instituicao: DEMO_INSTITUTION,
      },
      include: {
        carteiras: {
          where: { ativo: true },
          select: {
            id: true,
            nome: true,
            saldoAtual: true,
            instituicaoOf: true,
            tipoContaOf: true,
            moedaOf: true,
            idContaExterna: true,
          },
        },
      },
    });

    return {
      connection: updated,
      accountsImported: 2,
      transactionsImported,
      transactionsSkipped,
      metasImported: planning.metasImported,
      orcamentosImported: planning.orcamentosImported,
      investmentsImported: planning.investmentsImported,
      demo: true as const,
    };
  }

  private async applyPedroDemoPlanning(userId: string) {
    const planning = buildPedroDemoPlanning();

    await this.prisma.progressoMeta.deleteMany({
      where: { meta: { idUsuario: userId, descricao: DEMO_PLANNING_TAG } },
    });
    await this.prisma.meta.deleteMany({
      where: { idUsuario: userId, descricao: DEMO_PLANNING_TAG },
    });
    await this.prisma.orcamento.deleteMany({
      where: { idUsuario: userId, observacao: DEMO_PLANNING_TAG },
    });
    await this.prisma.investment.deleteMany({
      where: { userId, ticker: { startsWith: DEMO_INVESTMENT_TICKER_PREFIX } },
    });

    let metasImported = 0;
    for (const item of planning.metas) {
      await this.prisma.meta.create({
        data: {
          idUsuario: userId,
          nome: item.nome,
          descricao: item.descricao,
          valorObjetivo: new Prisma.Decimal(item.valorObjetivo.toFixed(2)),
          valorAtual: new Prisma.Decimal(item.valorAtual.toFixed(2)),
          dataInicio: new Date(`${item.dataInicio}T00:00:00.000Z`),
          dataFim: new Date(`${item.dataFim}T00:00:00.000Z`),
          progressos: {
            create: item.progressos.map((p) => ({
              data: new Date(`${p.data}T00:00:00.000Z`),
              valor: new Prisma.Decimal(p.valor.toFixed(2)),
              observacao: p.observacao,
            })),
          },
        },
      });
      metasImported += 1;
    }

    let orcamentosImported = 0;
    for (const item of planning.orcamentos) {
      const categorias = [];
      for (const line of item.categorias) {
        const idCategoria = await this.categorization.resolveCategoryId(
          userId,
          line.hint,
          'DESPESA',
        );
        categorias.push({
          idCategoria,
          limite: new Prisma.Decimal(line.limite.toFixed(2)),
        });
      }

      await this.prisma.orcamento.create({
        data: {
          idUsuario: userId,
          mes: item.mes,
          ano: item.ano,
          nome: item.nome,
          valorTotal: new Prisma.Decimal(item.valorTotal.toFixed(2)),
          observacao: item.observacao,
          categorias: { create: categorias },
        },
      });
      orcamentosImported += 1;
    }

    let investmentsImported = 0;
    for (const item of planning.investments) {
      await this.prisma.investment.create({
        data: {
          userId,
          name: item.name,
          type: item.type,
          ticker: item.ticker,
          currency: 'BRL',
          quantity: new Prisma.Decimal(item.quantity.toFixed(8)),
          averagePrice: new Prisma.Decimal(item.averagePrice.toFixed(2)),
          transactions: {
            create: item.transactions.map((tx) => ({
              userId,
              kind: tx.kind,
              quantity: new Prisma.Decimal(tx.quantity.toFixed(8)),
              unitPrice: new Prisma.Decimal(tx.unitPrice.toFixed(2)),
              occurredAt: new Date(tx.occurredAt),
              notes: tx.notes,
            })),
          },
        },
      });
      investmentsImported += 1;
    }

    return { metasImported, orcamentosImported, investmentsImported };
  }

  private async purgeOpenFinanceLedger(userId: string, connectionId: string) {
    const carteiras = await this.prisma.carteira.findMany({
      where: { idConexaoOf: connectionId, idUsuario: userId },
      select: { id: true },
    });
    const carteiraIds = carteiras.map((c) => c.id);
    if (carteiraIds.length === 0) return;

    await this.prisma.transacao.deleteMany({
      where: {
        idCarteira: { in: carteiraIds },
        origem: 'OPEN_FINANCE',
      },
    });

    const remaining = await this.prisma.transacao.groupBy({
      by: ['idCarteira'],
      where: { idCarteira: { in: carteiraIds }, ativo: true },
      _count: { _all: true },
    });
    const keep = new Set(
      remaining.filter((row) => row._count._all > 0).map((row) => row.idCarteira),
    );
    const keepIds = carteiraIds.filter((id) => keep.has(id));
    const dropIds = carteiraIds.filter((id) => !keep.has(id));
    const unlink = {
      idConexaoOf: null,
      idContaExterna: null,
      instituicaoOf: null,
      tipoContaOf: null,
      moedaOf: null,
    };

    if (keepIds.length > 0) {
      await this.prisma.carteira.updateMany({
        where: { id: { in: keepIds } },
        data: { ...unlink, ativo: true },
      });
    }
    if (dropIds.length > 0) {
      await this.prisma.carteira.updateMany({
        where: { id: { in: dropIds } },
        data: { ...unlink, ativo: false, saldoAtual: 0 },
      });
    }
  }

  private isDemoEnabled(): boolean {
    const flag = this.configService.get('OPEN_FINANCE_DEMO_ENABLED', { infer: true });
    if (flag === 'true') return true;
    if (flag === 'false') return false;
    return this.belvo.runtime.env === 'sandbox';
  }

  async listAccounts(userId: string) {
    return this.prisma.carteira.findMany({
      where: {
        idUsuario: userId,
        ativo: true,
        idContaExterna: { not: null },
      },
      orderBy: { dataCriacao: 'desc' },
    });
  }

  async listOpenFinanceTransactions(userId: string) {
    return this.prisma.transacao.findMany({
      where: {
        ativo: true,
        origem: 'OPEN_FINANCE',
        carteira: { idUsuario: userId },
      },
      include: { carteira: true, categoria: true },
      orderBy: { dataTransacao: 'desc' },
      take: 100,
    });
  }

  async sync(userId: string, connectionId: string) {
    const conexao = await this.findOwnedConnection(userId, connectionId);

    // Demo sandbox: re-apply current Pedro ledger so "Sincronizar" picks up new sample data.
    if (conexao.belvoLinkId.startsWith(DEMO_LINK_PREFIX)) {
      await this.prisma.conexaoOpenFinance.update({
        where: { id: conexao.id },
        data: { status: 'SYNCING', ultimoErro: null },
      });
      await this.purgeOpenFinanceLedger(userId, conexao.id);
      return this.applyPedroDemoLedger(userId, conexao.id);
    }

    try {
      return await this.syncService.syncConnection(connectionId, userId);
    } catch (error) {
      this.rethrowBelvo(error);
    }
  }

  private async findOwnedConnection(userId: string, connectionId: string) {
    const conexao = await this.prisma.conexaoOpenFinance.findFirst({
      where: { id: connectionId, idUsuario: userId },
    });
    if (!conexao || conexao.status === 'DISCONNECTED') {
      throw new NotFoundException('Conexão Open Finance não encontrada');
    }
    return conexao;
  }

  private normalizeCpf(cpf: string): string {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) {
      throw new BadRequestException('CPF inválido');
    }
    return digits;
  }

  private buildWidgetUrl(accessToken: string): string {
    // Mínimo OFDA da doc Belvo; extras opcionais costumam quebrar o Hosted Widget revamp.
    const params = new URLSearchParams({
      access_token: accessToken,
      locale: 'pt',
    });
    if (this.belvo.runtime.env === 'sandbox') {
      params.set('institutions', this.belvo.runtime.sandboxInstitution);
    }
    return `https://widget.belvo.io/?${params.toString()}`;
  }

  private rethrowBelvo(error: unknown): never {
    if (error instanceof BelvoApiError) {
      throw new BadRequestException(
        'Não foi possível atualizar seus dados. Tente novamente em alguns instantes.',
      );
    }
    throw error;
  }
}
