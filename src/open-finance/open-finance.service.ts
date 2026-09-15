import {
  BadRequestException,
  ConflictException,
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
import { CreateConnectionDto, DemoConnectDto, WidgetTokenDto } from './dto/open-finance.dto';
import { DISPLAY_BANK_NAME, displayInstitutionName } from './institution-display';
import { OpenFinanceSyncService } from './open-finance-sync.service';

const DEMO_LINK_PREFIX = 'demo-';
const DEMO_INSTITUTION = DISPLAY_BANK_NAME;

type DemoTxTemplate = {
  tipo: 'RECEITA' | 'DESPESA';
  descricao: string;
  baseValor: number;
  daysAgo: number;
  account: 'checking' | 'savings';
};

const DEMO_TX_POOL: DemoTxTemplate[] = [
  {
    tipo: 'RECEITA',
    descricao: 'SALARIO EMPRESA',
    baseValor: 4800,
    daysAgo: 3,
    account: 'checking',
  },
  {
    tipo: 'RECEITA',
    descricao: 'FREELANCE DESIGN',
    baseValor: 1500,
    daysAgo: 6,
    account: 'checking',
  },
  { tipo: 'RECEITA', descricao: 'PIX RECEBIDO', baseValor: 250, daysAgo: 1, account: 'savings' },
  {
    tipo: 'RECEITA',
    descricao: 'RENDIMENTO POUPANCA',
    baseValor: 45,
    daysAgo: 2,
    account: 'savings',
  },
  { tipo: 'DESPESA', descricao: 'IFOOD *PEDIDO', baseValor: 72, daysAgo: 2, account: 'checking' },
  { tipo: 'DESPESA', descricao: 'UBER TRIP', baseValor: 28, daysAgo: 2, account: 'checking' },
  {
    tipo: 'DESPESA',
    descricao: 'NETFLIX ASSINATURA',
    baseValor: 55.9,
    daysAgo: 5,
    account: 'checking',
  },
  {
    tipo: 'DESPESA',
    descricao: 'SPOTIFY PREMIUM',
    baseValor: 34.9,
    daysAgo: 7,
    account: 'checking',
  },
  {
    tipo: 'DESPESA',
    descricao: 'ALUGUEL APARTAMENTO',
    baseValor: 1800,
    daysAgo: 8,
    account: 'checking',
  },
  { tipo: 'DESPESA', descricao: 'MERCADO EXTRA', baseValor: 210, daysAgo: 1, account: 'checking' },
  {
    tipo: 'DESPESA',
    descricao: 'FARMACIA DROGASIL',
    baseValor: 89,
    daysAgo: 4,
    account: 'checking',
  },
  { tipo: 'DESPESA', descricao: 'POSTO IPIRANGA', baseValor: 180, daysAgo: 3, account: 'checking' },
  {
    tipo: 'DESPESA',
    descricao: 'ACADEMIA SMARTFIT',
    baseValor: 129.9,
    daysAgo: 9,
    account: 'checking',
  },
  { tipo: 'DESPESA', descricao: 'RAPPI *PEDIDO', baseValor: 54.5, daysAgo: 4, account: 'checking' },
];

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

    const carteiras = await this.prisma.carteira.findMany({
      where: { idConexaoOf: conexao.id, idUsuario: userId },
      select: { id: true },
    });
    const carteiraIds = carteiras.map((c) => c.id);

    if (carteiraIds.length > 0) {
      // Remove OF ledger rows so they disappear from dashboard/transações.
      await this.prisma.transacao.deleteMany({
        where: {
          idCarteira: { in: carteiraIds },
          origem: 'OPEN_FINANCE',
        },
      });
      await this.prisma.carteira.updateMany({
        where: { id: { in: carteiraIds } },
        data: { ativo: false, saldoAtual: 0 },
      });
    }

    return this.prisma.conexaoOpenFinance.update({
      where: { id: conexao.id },
      data: { status: 'DISCONNECTED', ultimoErro: null },
    });
  }

  /**
   * Sandbox Open Finance connect: seeds accounts/transactions keyed by CPF
   * (different CPF → different ledger sample). No Belvo widget required.
   */
  async seedDemo(userId: string, email: string | undefined, dto: DemoConnectDto) {
    if (!this.isDemoEnabled()) {
      throw new ServiceUnavailableException('Conexão Open Finance indisponível no momento.');
    }

    await this.usersService.getOrCreateMe(userId, email);
    const cpf = this.normalizeCpf(dto.cpf);
    const fullName = dto.fullName.trim().slice(0, 120);

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

    const belvoLinkId = `${DEMO_LINK_PREFIX}${cpf}`;
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

    const profile = this.buildDemoProfile(cpf, fullName);
    const checkingExt = `demo-acc-checking-${cpf}`;
    const savingsExt = `demo-acc-savings-${cpf}`;

    const checking = await this.upsertDemoCarteira({
      userId,
      connectionId: conexao.id,
      idContaExterna: checkingExt,
      nome: 'Conta Corrente',
      tipoContaOf: 'checking',
      saldoAtual: profile.checkingBalance,
    });
    const savings = await this.upsertDemoCarteira({
      userId,
      connectionId: conexao.id,
      idContaExterna: savingsExt,
      nome: 'Poupança',
      tipoContaOf: 'savings',
      saldoAtual: profile.savingsBalance,
    });

    let transactionsImported = 0;
    const transactionsSkipped = 0;

    for (const [index, tx] of profile.transactions.entries()) {
      const idExterno = `demo-tx-${cpf}-${index + 1}`;
      const idCategoria = await this.categorization.resolveCategoryId(
        userId,
        tx.descricao,
        tx.tipo,
      );
      const dataTransacao = new Date();
      dataTransacao.setUTCDate(dataTransacao.getUTCDate() - tx.daysAgo);

      await this.prisma.transacao.create({
        data: {
          idCarteira: tx.account === 'checking' ? checking.id : savings.id,
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

    const updated = await this.prisma.conexaoOpenFinance.update({
      where: { id: conexao.id },
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
      demo: true as const,
    };
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
    await this.prisma.carteira.updateMany({
      where: { id: { in: carteiraIds } },
      data: { ativo: false, saldoAtual: 0 },
    });
  }

  /** Deterministic sample ledger from CPF digits (different CPF → different values). */
  private buildDemoProfile(cpf: string, fullName: string) {
    const seed = Number(cpf.slice(-6)) || 1;
    const mul = (n: number) => ((seed * (n + 17)) % 1000) / 1000;
    const pick = <T>(items: T[], count: number, offset: number): T[] => {
      const out: T[] = [];
      for (let i = 0; i < count; i += 1) {
        out.push(items[(offset + i * 3 + (seed % items.length)) % items.length]!);
      }
      return out;
    };

    const firstName = fullName.split(/\s+/)[0] ?? 'Cliente';
    const checkingBalance = Number((1800 + mul(1) * 4200).toFixed(2));
    const savingsBalance = Number((400 + mul(2) * 2600).toFixed(2));
    const templates = pick(DEMO_TX_POOL, 8, seed % DEMO_TX_POOL.length);

    const transactions = templates.map((t, i) => {
      const factor = 0.7 + mul(i + 3) * 0.9;
      let descricao = t.descricao;
      if (t.descricao === 'SALARIO EMPRESA') {
        descricao = `SALARIO ${firstName.toUpperCase()}`;
      }
      if (t.descricao === 'PIX RECEBIDO') {
        descricao = `PIX RECEBIDO ${firstName.toUpperCase()}`;
      }
      return {
        tipo: t.tipo,
        descricao,
        valor: Number((t.baseValor * factor).toFixed(2)),
        daysAgo: t.daysAgo + (seed % 3),
        account: t.account,
      };
    });

    return { checkingBalance, savingsBalance, transactions };
  }

  private async upsertDemoCarteira(input: {
    userId: string;
    connectionId: string;
    idContaExterna: string;
    nome: string;
    tipoContaOf: string;
    saldoAtual: number;
  }) {
    const existing = await this.prisma.carteira.findFirst({
      where: { idContaExterna: input.idContaExterna },
    });
    if (existing) {
      if (existing.idUsuario !== input.userId) {
        throw new ConflictException('Conta já associada a outro usuário');
      }
      return this.prisma.carteira.update({
        where: { id: existing.id },
        data: {
          nome: input.nome,
          descricao: `Open Finance · ${DEMO_INSTITUTION}`,
          idConexaoOf: input.connectionId,
          instituicaoOf: DEMO_INSTITUTION,
          tipoContaOf: input.tipoContaOf,
          moedaOf: 'BRL',
          saldoAtual: input.saldoAtual,
          ativo: true,
        },
      });
    }

    return this.prisma.carteira.create({
      data: {
        idUsuario: input.userId,
        nome: input.nome,
        descricao: `Open Finance · ${DEMO_INSTITUTION}`,
        saldoAtual: input.saldoAtual,
        idConexaoOf: input.connectionId,
        idContaExterna: input.idContaExterna,
        instituicaoOf: DEMO_INSTITUTION,
        tipoContaOf: input.tipoContaOf,
        moedaOf: 'BRL',
      },
    });
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
    await this.findOwnedConnection(userId, connectionId);
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
