import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OpenFinanceService } from './open-finance.service';
import { OpenFinanceSyncService } from './open-finance-sync.service';
import { BelvoWebhooksService } from './webhooks/belvo-webhooks.service';
import { BelvoApiError } from './belvo/belvo.types';
import { matchCategoryRule } from './categorization/category-rules';
import {
  buildPedroDemoPlanning,
  buildPedroDemoProfile,
  DEMO_ALLOWED_CPF,
  DEMO_ALLOWED_NAME,
  maskSecret,
} from './demo-pedro-profile';

describe('matchCategoryRule', () => {
  it('maps IFOOD to Alimentação', () => {
    expect(matchCategoryRule('IFOOD *PEDIDO', 'DESPESA')?.categoryName).toBe('Alimentação');
  });

  it('maps UBER to Transporte', () => {
    expect(matchCategoryRule('UBER TRIP', 'DESPESA')?.categoryName).toBe('Transporte');
  });

  it('maps SALARIO to Receita', () => {
    expect(matchCategoryRule('SALARIO EMPRESA', 'RECEITA')?.categoryName).toBe('Receita');
  });

  it('maps APLICACAO CDB to Investimentos', () => {
    expect(matchCategoryRule('APLICACAO CDB NUBANK', 'DESPESA')?.categoryName).toBe(
      'Investimentos',
    );
  });

  it('maps CARTAO DE CREDITO hint to Cartão de Crédito', () => {
    expect(matchCategoryRule('CARTAO DE CREDITO NUBANK', 'DESPESA')?.categoryName).toBe(
      'Cartão de Crédito',
    );
  });
});

describe('demo-pedro-profile', () => {
  it('masks names and keys keeping the first 3 characters', () => {
    expect(maskSecret('Pedro')).toBe('Ped**');
    expect(maskSecret('47017638883')).toBe('470********');
    expect(maskSecret('Jo')).toBe('Jo');
  });

  it('builds a coherent Nubank ledger without salary of 3000', () => {
    const profile = buildPedroDemoProfile();
    expect(profile.creditCardBalance).toBeGreaterThan(83.8);
    expect(profile.transactions.some((t) => t.valor === 3000)).toBe(false);
    expect(profile.transactions.filter((t) => t.valor === 2000).length).toBe(3);
    expect(
      profile.transactions.find((t) => t.descricao === 'NETFLIX PREMIUM')?.valor,
    ).toBe(59.9);
    expect(
      profile.transactions.find((t) => t.descricao === 'SPOTIFY PREMIUM')?.valor,
    ).toBe(23.9);
    expect(profile.transactions.some((t) => t.descricao === 'NETSHOES')).toBe(true);
    expect(profile.transactions.some((t) => t.descricao === 'MERCADO LIVRE')).toBe(true);
    expect(profile.transactions.some((t) => t.descricao.includes('99 FOOD'))).toBe(true);
    expect(profile.transactions.some((t) => t.descricao.includes('IFOOD'))).toBe(true);
    expect(profile.transactions.some((t) => t.descricao.includes('UBER'))).toBe(true);
    expect(profile.transactions.every((t) => !t.descricao.includes('RAPPI'))).toBe(true);
    expect(profile.transactions.every((t) => !t.descricao.includes('POSTO'))).toBe(true);
    expect(profile.transactions.some((t) => t.descricao.includes('·'))).toBe(true);
    expect(profile.transactions.some((t) => t.descricao.includes('*'))).toBe(true);
    expect(profile.transactions.filter((t) => t.account === 'credit_card').length).toBeGreaterThan(
      2,
    );
    expect(profile.transactions.every((t) => t.account !== ('savings' as string))).toBe(true);
  });

  it('includes metas and monthly budgets for Pedro', () => {
    const planning = buildPedroDemoPlanning();
    expect(planning.metas).toHaveLength(2);
    expect(planning.orcamentos).toHaveLength(3);
    expect(planning.metas[0]?.nome).toBe('Reserva de emergência');
    expect(planning.orcamentos.some((o) => o.mes === 9 && o.ano === 2026)).toBe(true);
    expect(planning.investments).toHaveLength(2);
    expect(planning.investments[0]?.name).toBe('CDB Nubank 100% CDI');
    expect(planning.investments.every((i) => i.ticker.startsWith('OF-'))).toBe(true);
  });
});

describe('OpenFinanceService', () => {
  const prisma = {
    usuario: { update: jest.fn() },
    conexaoOpenFinance: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    carteira: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    transacao: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    meta: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    progressoMeta: {
      deleteMany: jest.fn(),
    },
    orcamento: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    investment: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const usersService = {
    getOrCreateMe: jest.fn().mockResolvedValue({ id: 'user-a', nome: 'Ana', cpf: null }),
  };

  const belvo = {
    runtime: { env: 'sandbox', sandboxInstitution: 'ofmockbank_br_retail' },
    createWidgetAccessToken: jest.fn(),
    deleteLink: jest.fn(),
  };

  const syncService = {
    syncConnection: jest.fn(),
  };

  const categorization = {
    resolveCategoryId: jest.fn().mockResolvedValue('cat-1'),
  };

  const configService = {
    get: jest.fn().mockReturnValue(undefined),
  };

  const service = new OpenFinanceService(
    prisma as never,
    usersService as never,
    belvo as never,
    syncService as never,
    categorization as never,
    configService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.carteira.findMany.mockResolvedValue([]);
    prisma.carteira.findFirst.mockResolvedValue(null);
    prisma.transacao.groupBy.mockResolvedValue([]);
    prisma.meta.create.mockResolvedValue({});
    prisma.meta.deleteMany.mockResolvedValue({ count: 0 });
    prisma.progressoMeta.deleteMany.mockResolvedValue({ count: 0 });
    prisma.orcamento.create.mockResolvedValue({});
    prisma.orcamento.deleteMany.mockResolvedValue({ count: 0 });
    prisma.investment.create.mockResolvedValue({});
    prisma.investment.deleteMany.mockResolvedValue({ count: 0 });
  });

  it('creates widget token associated to authenticated user CPF', async () => {
    belvo.createWidgetAccessToken.mockResolvedValue({ access: 'tok', refresh: 'ref' });
    prisma.usuario.update.mockResolvedValue({});

    const result = await service.createWidgetToken('user-a', 'ana@test.com', {
      cpf: '76109277673',
      fullName: 'Ralph Bragg',
    });

    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-a' },
        data: expect.objectContaining({ cpf: '76109277673' }),
      }),
    );
    expect(belvo.createWidgetAccessToken).toHaveBeenCalledWith({
      cpf: '76109277673',
      fullName: 'Ralph Bragg',
    });
    expect(result.access).toBe('tok');
    expect(result.widgetUrl).toContain('access_token=tok');
    expect(result.widgetUrl).toContain('locale=pt');
    expect(result.widgetUrl).toContain('ofmockbank_br_retail');
  });

  it('rejects demo seed when CPF or name do not match Pedro', async () => {
    await expect(
      service.seedDemo('user-a', 'ana@test.com', {
        cpf: '76109277673',
        fullName: 'Ralph Bragg',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.seedDemo('user-a', 'ana@test.com', {
        cpf: DEMO_ALLOWED_CPF,
        fullName: 'Outro Nome',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.conexaoOpenFinance.create).not.toHaveBeenCalled();
  });

  it('seeds Pedro demo with Nubank checking + credit card ledger', async () => {
    const profile = buildPedroDemoProfile();
    prisma.usuario.update.mockResolvedValue({});
    prisma.conexaoOpenFinance.findMany.mockResolvedValue([]);
    prisma.conexaoOpenFinance.findUnique.mockResolvedValue(null);
    prisma.conexaoOpenFinance.create.mockResolvedValue({
      id: 'conn-demo',
      idUsuario: 'user-a',
      belvoLinkId: `demo-${DEMO_ALLOWED_CPF}`,
      status: 'ACTIVE',
    });
    prisma.carteira.findFirst.mockResolvedValue(null);
    prisma.carteira.create
      .mockResolvedValueOnce({ id: 'c-check', idUsuario: 'user-a' })
      .mockResolvedValueOnce({ id: 'c-card', idUsuario: 'user-a' });
    prisma.transacao.create.mockResolvedValue({});
    prisma.conexaoOpenFinance.update.mockResolvedValue({
      id: 'conn-demo',
      instituicao: 'Nubank',
      status: 'ACTIVE',
      carteiras: [],
    });

    const result = await service.seedDemo('user-a', 'pedro@test.com', {
      cpf: DEMO_ALLOWED_CPF,
      fullName: 'pedro gomes de almeida',
    });

    expect(result.demo).toBe(true);
    expect(result.accountsImported).toBe(2);
    expect(result.transactionsImported).toBe(profile.transactions.length);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { cpf: DEMO_ALLOWED_CPF, nome: 'pedro gomes de almeida' },
      }),
    );
    expect(prisma.conexaoOpenFinance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ belvoLinkId: `demo-${DEMO_ALLOWED_CPF}` }),
      }),
    );
    expect(prisma.carteira.create).toHaveBeenCalledTimes(2);
    expect(prisma.carteira.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        nome: 'Conta Corrente',
        tipoContaOf: 'checking',
        saldoAtual: profile.checkingBalance,
      }),
    );
    expect(prisma.carteira.create.mock.calls[1][0].data).toEqual(
      expect.objectContaining({
        nome: 'Cartão de Crédito',
        tipoContaOf: 'credit_card',
        saldoAtual: profile.creditCardBalance,
      }),
    );

    const createdTx = prisma.transacao.create.mock.calls.map(
      (call: [{ data: { descricao: string; valor: unknown } }]) => call[0].data,
    );
    expect(
      createdTx.some(
        (t) => t.descricao === 'NETFLIX PREMIUM' && Number(t.valor) === 59.9,
      ),
    ).toBe(true);
    expect(
      createdTx.some(
        (t) => t.descricao === 'SPOTIFY PREMIUM' && Number(t.valor) === 23.9,
      ),
    ).toBe(true);
    expect(createdTx.some((t) => Number(t.valor) === 2000)).toBe(true);
    expect(createdTx.some((t) => Number(t.valor) === 3000)).toBe(false);
    expect(createdTx.some((t) => t.descricao.includes('·'))).toBe(true);
    expect(categorization.resolveCategoryId).toHaveBeenCalledWith(
      'user-a',
      'CARTAO DE CREDITO NUBANK',
      'DESPESA',
    );
    expect(result.metasImported).toBe(2);
    expect(result.orcamentosImported).toBe(3);
    expect(result.investmentsImported).toBe(2);
    expect(prisma.meta.create).toHaveBeenCalledTimes(2);
    expect(prisma.orcamento.create).toHaveBeenCalledTimes(3);
    expect(prisma.investment.create).toHaveBeenCalledTimes(2);
    expect(prisma.meta.create.mock.calls[0][0].data.nome).toBe('Reserva de emergência');
    expect(prisma.orcamento.create.mock.calls[2][0].data.nome).toBe('Orçamento Setembro 2026');
    expect(prisma.investment.create.mock.calls[0][0].data.name).toBe('CDB Nubank 100% CDI');
  });

  it('reuses existing wallets with the same name instead of duplicating', async () => {
    prisma.usuario.update.mockResolvedValue({});
    prisma.conexaoOpenFinance.findMany.mockResolvedValue([]);
    prisma.conexaoOpenFinance.findUnique.mockResolvedValue(null);
    prisma.conexaoOpenFinance.create.mockResolvedValue({
      id: 'conn-demo',
      idUsuario: 'user-a',
      belvoLinkId: `demo-${DEMO_ALLOWED_CPF}`,
      status: 'ACTIVE',
    });
    prisma.carteira.findMany.mockResolvedValue([
      {
        id: 'manual-checking',
        idUsuario: 'user-a',
        nome: 'Conta corrente',
        ativo: true,
        idContaExterna: null,
      },
      {
        id: 'manual-card',
        idUsuario: 'user-a',
        nome: 'Cartao de Credito',
        ativo: true,
        idContaExterna: null,
      },
    ]);
    prisma.carteira.update
      .mockResolvedValueOnce({ id: 'manual-checking', idUsuario: 'user-a' })
      .mockResolvedValueOnce({ id: 'manual-card', idUsuario: 'user-a' });
    prisma.transacao.create.mockResolvedValue({});
    prisma.conexaoOpenFinance.update.mockResolvedValue({
      id: 'conn-demo',
      instituicao: 'Nubank',
      status: 'ACTIVE',
      carteiras: [],
    });

    await service.seedDemo('user-a', 'pedro@test.com', {
      cpf: DEMO_ALLOWED_CPF,
      fullName: DEMO_ALLOWED_NAME,
    });

    expect(prisma.carteira.create).not.toHaveBeenCalled();
    expect(prisma.carteira.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'manual-checking' },
        data: expect.objectContaining({
          idContaExterna: `demo-acc-checking-${DEMO_ALLOWED_CPF}`,
        }),
      }),
    );
    expect(prisma.carteira.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'manual-card' },
        data: expect.objectContaining({
          idContaExterna: `demo-acc-credit-${DEMO_ALLOWED_CPF}`,
        }),
      }),
    );
  });

  it('deletes Open Finance transactions on disconnect', async () => {
    prisma.conexaoOpenFinance.findFirst.mockResolvedValue({
      id: 'conn-1',
      idUsuario: 'user-a',
      belvoLinkId: `demo-${DEMO_ALLOWED_CPF}`,
      status: 'ACTIVE',
    });
    prisma.carteira.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
    prisma.transacao.deleteMany.mockResolvedValue({ count: 8 });
    prisma.carteira.updateMany.mockResolvedValue({ count: 2 });
    prisma.conexaoOpenFinance.update.mockResolvedValue({
      id: 'conn-1',
      status: 'DISCONNECTED',
    });

    await service.disconnect('user-a', 'conn-1');

    expect(prisma.transacao.deleteMany).toHaveBeenCalledWith({
      where: {
        idCarteira: { in: ['c1', 'c2'] },
        origem: 'OPEN_FINANCE',
      },
    });
    expect(prisma.carteira.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['c1', 'c2'] } },
      data: expect.objectContaining({
        ativo: false,
        idContaExterna: null,
        idConexaoOf: null,
      }),
    });
    expect(belvo.deleteLink).not.toHaveBeenCalled();
  });

  it('binds Belvo link to the authenticated user on createConnection', async () => {
    prisma.conexaoOpenFinance.findUnique.mockResolvedValue(null);
    prisma.conexaoOpenFinance.create.mockResolvedValue({
      id: 'conn-1',
      idUsuario: 'user-a',
      belvoLinkId: '11111111-1111-1111-1111-111111111111',
    });

    const created = await service.createConnection('user-a', {
      belvoLinkId: '11111111-1111-1111-1111-111111111111',
      institution: 'ofmockbank_br_retail',
    });

    expect(created.idUsuario).toBe('user-a');
    expect(prisma.conexaoOpenFinance.create).toHaveBeenCalledWith({
      data: {
        idUsuario: 'user-a',
        belvoLinkId: '11111111-1111-1111-1111-111111111111',
        instituicao: 'Nubank',
        status: 'PENDING',
      },
    });
  });

  it('rejects link owned by another user', async () => {
    prisma.conexaoOpenFinance.findUnique.mockResolvedValue({
      id: 'conn-1',
      idUsuario: 'user-b',
      status: 'ACTIVE',
    });

    await expect(
      service.createConnection('user-a', {
        belvoLinkId: '11111111-1111-1111-1111-111111111111',
        institution: 'ofmockbank_br_retail',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('isolates sync to owned connections', async () => {
    prisma.conexaoOpenFinance.findFirst.mockResolvedValue(null);
    await expect(
      service.sync('user-a', '22222222-2222-2222-2222-222222222222'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(syncService.syncConnection).not.toHaveBeenCalled();
  });

  it('re-applies Pedro demo ledger on sync instead of no-op', async () => {
    const profile = buildPedroDemoProfile();
    prisma.conexaoOpenFinance.findFirst.mockResolvedValue({
      id: 'conn-demo',
      idUsuario: 'user-a',
      belvoLinkId: `demo-${DEMO_ALLOWED_CPF}`,
      status: 'ACTIVE',
    });
    prisma.conexaoOpenFinance.update.mockResolvedValue({
      id: 'conn-demo',
      status: 'ACTIVE',
      instituicao: 'Nubank',
      carteiras: [],
    });
    prisma.carteira.findMany
      .mockResolvedValueOnce([{ id: 'c-old' }])
      .mockResolvedValue([]);
    prisma.transacao.deleteMany.mockResolvedValue({ count: 1 });
    prisma.transacao.groupBy.mockResolvedValue([]);
    prisma.carteira.updateMany.mockResolvedValue({ count: 1 });
    prisma.carteira.findFirst.mockResolvedValue(null);
    prisma.carteira.create
      .mockResolvedValueOnce({ id: 'c-check', idUsuario: 'user-a' })
      .mockResolvedValueOnce({ id: 'c-card', idUsuario: 'user-a' });
    prisma.transacao.create.mockResolvedValue({});

    const result = await service.sync('user-a', 'conn-demo');

    expect(syncService.syncConnection).not.toHaveBeenCalled();
    expect(prisma.transacao.deleteMany).toHaveBeenCalled();
    expect(result.demo).toBe(true);
    expect(result.accountsImported).toBe(2);
    expect(result.transactionsImported).toBe(profile.transactions.length);
    expect(prisma.carteira.create).toHaveBeenCalledTimes(2);
    expect(prisma.transacao.create).toHaveBeenCalledTimes(profile.transactions.length);
  });
});

describe('OpenFinanceSyncService idempotency', () => {
  const prisma = {
    conexaoOpenFinance: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    carteira: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    transacao: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const belvo = {
    listAccounts: jest.fn(),
    listTransactions: jest.fn(),
  };

  const categorization = {
    resolveCategoryId: jest.fn().mockResolvedValue('cat-1'),
  };

  const service = new OpenFinanceSyncService(
    prisma as never,
    belvo as never,
    categorization as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.conexaoOpenFinance.findFirst.mockResolvedValue({
      id: 'conn-1',
      idUsuario: 'user-a',
      belvoLinkId: 'link-1',
      status: 'ACTIVE',
    });
    prisma.conexaoOpenFinance.update.mockResolvedValue({
      id: 'conn-1',
      status: 'ACTIVE',
    });
    belvo.listAccounts.mockResolvedValue([
      {
        id: 'acc-1',
        link: 'link-1',
        name: 'Conta Corrente',
        currency: 'BRL',
        balance: { current: 100 },
        institution: { name: 'Mockbank' },
      },
    ]);
    prisma.carteira.findFirst.mockResolvedValue(null);
    prisma.carteira.findMany.mockResolvedValue([]);
    prisma.carteira.create.mockResolvedValue({ id: 'cart-1', idUsuario: 'user-a' });
    prisma.carteira.update.mockResolvedValue({});
  });

  it('reuses an existing wallet with the same name instead of creating another', async () => {
    belvo.listTransactions.mockResolvedValue([]);
    prisma.carteira.findMany.mockResolvedValue([
      {
        id: 'manual-1',
        idUsuario: 'user-a',
        nome: 'conta corrente',
        ativo: true,
        idContaExterna: null,
      },
    ]);
    prisma.carteira.update.mockResolvedValue({ id: 'manual-1', idUsuario: 'user-a' });

    await service.syncConnection('conn-1', 'user-a');

    expect(prisma.carteira.create).not.toHaveBeenCalled();
    expect(prisma.carteira.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'manual-1' },
        data: expect.objectContaining({
          idContaExterna: 'acc-1',
          ativo: true,
        }),
      }),
    );
  });

  it('skips duplicate Belvo transactions by id_externo', async () => {
    belvo.listTransactions.mockResolvedValue([
      {
        id: 'tx-belvo-1',
        account: 'acc-1',
        amount: -42.9,
        description: 'IFOOD',
        value_date: '2026-09-08',
      },
    ]);
    prisma.transacao.findUnique.mockResolvedValue({ id: 'already' });

    const result = await service.syncConnection('conn-1', 'user-a');

    expect(prisma.transacao.create).not.toHaveBeenCalled();
    expect(result.transactionsSkipped).toBe(1);
    expect(result.transactionsImported).toBe(0);
  });

  it('imports new expense as DESPESA with absolute valor', async () => {
    belvo.listTransactions.mockResolvedValue([
      {
        id: 'tx-belvo-2',
        account: 'acc-1',
        amount: -42.9,
        description: 'IFOOD',
        value_date: '2026-09-08',
      },
    ]);
    prisma.transacao.findUnique.mockResolvedValue(null);
    prisma.transacao.create.mockResolvedValue({});

    const result = await service.syncConnection('conn-1', 'user-a');

    expect(prisma.transacao.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipo: 'DESPESA',
          origem: 'OPEN_FINANCE',
          idExterno: 'tx-belvo-2',
          provedor: 'BELVO',
        }),
      }),
    );
    const createdPayload = prisma.transacao.create.mock.calls[0][0].data;
    expect(String(createdPayload.valor)).toBe('42.9');
    expect(result.transactionsImported).toBe(1);
  });
});

describe('BelvoWebhooksService', () => {
  const prisma = {
    eventoSyncOpenFinance: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conexaoOpenFinance: {
      findUnique: jest.fn(),
    },
  };
  const syncService = {
    syncByBelvoLinkId: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'BELVO_WEBHOOK_SECRET') return 'secret-token';
      if (key === 'BELVO_ENV') return 'sandbox';
      if (key === 'BELVO_BASE_URL') return 'https://sandbox.belvo.com';
      if (key === 'FRONTEND_URL') return 'http://localhost:5173';
      return undefined;
    }),
  };

  const service = new BelvoWebhooksService(
    configService as never,
    prisma as never,
    syncService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid webhook authorization', () => {
    expect(() => service.assertAuthorized('Bearer wrong')).toThrow(UnauthorizedException);
  });

  it('accepts configured bearer token and syncs on historical_update', async () => {
    service.assertAuthorized('Bearer secret-token');
    prisma.eventoSyncOpenFinance.findUnique.mockResolvedValue(null);
    prisma.conexaoOpenFinance.findUnique.mockResolvedValue({ id: 'conn-1', belvoLinkId: 'link-1' });
    prisma.eventoSyncOpenFinance.create.mockResolvedValue({ id: 'evt-1' });
    prisma.eventoSyncOpenFinance.update.mockResolvedValue({});
    syncService.syncByBelvoLinkId.mockResolvedValue({});

    const result = await service.handle({
      webhook_id: 'wh-1',
      webhook_type: 'TRANSACTIONS',
      webhook_code: 'historical_update',
      link_id: 'link-1',
    });

    expect(syncService.syncByBelvoLinkId).toHaveBeenCalledWith('link-1');
    expect(result).toEqual({ accepted: true, synced: true });
  });

  it('is idempotent for already processed webhook events', async () => {
    prisma.eventoSyncOpenFinance.findUnique.mockResolvedValue({
      id: 'evt-1',
      status: 'PROCESSED',
    });

    const result = await service.handle({
      webhook_id: 'wh-1',
      webhook_type: 'ACCOUNTS',
      webhook_code: 'historical_update',
      link_id: 'link-1',
    });

    expect(result).toEqual({ accepted: true, duplicate: true });
    expect(syncService.syncByBelvoLinkId).not.toHaveBeenCalled();
  });
});

describe('BelvoApiError mapping', () => {
  it('exposes safe error code without secrets', () => {
    const err = new BelvoApiError('safe', 503, 'NETWORK');
    expect(err.message).toBe('safe');
    expect(err.statusCode).toBe(503);
  });
});
