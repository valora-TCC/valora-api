import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { OpenFinanceService } from './open-finance.service';
import { OpenFinanceSyncService } from './open-finance-sync.service';
import { BelvoWebhooksService } from './webhooks/belvo-webhooks.service';
import { BelvoApiError } from './belvo/belvo.types';
import { matchCategoryRule } from './categorization/category-rules';

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

  it('seeds demo connection with sample accounts and transactions keyed by CPF', async () => {
    prisma.usuario.update.mockResolvedValue({});
    prisma.conexaoOpenFinance.findMany.mockResolvedValue([]);
    prisma.conexaoOpenFinance.findUnique.mockResolvedValue(null);
    prisma.conexaoOpenFinance.create.mockResolvedValue({
      id: 'conn-demo',
      idUsuario: 'user-a',
      belvoLinkId: 'demo-76109277673',
      status: 'ACTIVE',
    });
    prisma.carteira.findFirst.mockResolvedValue(null);
    prisma.carteira.create
      .mockResolvedValueOnce({ id: 'c-check', idUsuario: 'user-a' })
      .mockResolvedValueOnce({ id: 'c-save', idUsuario: 'user-a' });
    prisma.transacao.create.mockResolvedValue({});
    prisma.conexaoOpenFinance.update.mockResolvedValue({
      id: 'conn-demo',
      instituicao: 'Mockbank',
      status: 'ACTIVE',
      carteiras: [],
    });

    const result = await service.seedDemo('user-a', 'ana@test.com', {
      cpf: '76109277673',
      fullName: 'Ralph Bragg',
    });

    expect(result.demo).toBe(true);
    expect(result.accountsImported).toBe(2);
    expect(result.transactionsImported).toBe(8);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { cpf: '76109277673', nome: 'Ralph Bragg' },
      }),
    );
    expect(prisma.conexaoOpenFinance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ belvoLinkId: 'demo-76109277673' }),
      }),
    );
    expect(prisma.carteira.create).toHaveBeenCalledTimes(2);
    expect(prisma.transacao.create.mock.calls[0][0].data.idExterno).toContain('76109277673');
  });

  it('generates different balances for different CPFs', async () => {
    const seedOnce = async (cpf: string) => {
      jest.clearAllMocks();
      prisma.usuario.update.mockResolvedValue({});
      prisma.conexaoOpenFinance.findMany.mockResolvedValue([]);
      prisma.conexaoOpenFinance.findUnique.mockResolvedValue(null);
      prisma.conexaoOpenFinance.create.mockResolvedValue({
        id: `conn-${cpf}`,
        idUsuario: 'user-a',
        belvoLinkId: `demo-${cpf}`,
        status: 'ACTIVE',
      });
      prisma.carteira.findFirst.mockResolvedValue(null);
      prisma.carteira.create
        .mockResolvedValueOnce({ id: `c-check-${cpf}`, idUsuario: 'user-a' })
        .mockResolvedValueOnce({ id: `c-save-${cpf}`, idUsuario: 'user-a' });
      prisma.transacao.create.mockResolvedValue({});
      prisma.conexaoOpenFinance.update.mockResolvedValue({
        id: `conn-${cpf}`,
        status: 'ACTIVE',
        carteiras: [],
      });

      await service.seedDemo('user-a', 'ana@test.com', {
        cpf,
        fullName: 'Titular Teste',
      });

      return Number(prisma.carteira.create.mock.calls[0][0].data.saldoAtual);
    };

    const balanceA = await seedOnce('76109277673');
    const balanceB = await seedOnce('39053344705');
    expect(balanceA).not.toBe(balanceB);
  });

  it('deletes Open Finance transactions on disconnect', async () => {
    prisma.conexaoOpenFinance.findFirst.mockResolvedValue({
      id: 'conn-1',
      idUsuario: 'user-a',
      belvoLinkId: 'demo-76109277673',
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
        instituicao: 'ofmockbank_br_retail',
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
});

describe('OpenFinanceSyncService idempotency', () => {
  const prisma = {
    conexaoOpenFinance: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    carteira: {
      findFirst: jest.fn(),
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
    prisma.carteira.create.mockResolvedValue({ id: 'cart-1', idUsuario: 'user-a' });
    prisma.carteira.update.mockResolvedValue({});
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
