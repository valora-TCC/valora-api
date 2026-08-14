import { Decimal } from '@prisma/client/runtime/library';
import { AccountsService } from './accounts.service';

describe('AccountsService', () => {
  const prisma = {
    account: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    transaction: {
      groupBy: jest.fn(),
    },
  };

  const usersService = {
    getOrCreateMe: jest.fn(),
  };

  const service = new AccountsService(prisma as never, usersService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes balances when listing accounts', async () => {
    prisma.account.findMany.mockResolvedValue([
      {
        id: 'acc-1',
        userId: 'user-1',
        name: 'Conta',
        initialBalance: new Decimal(100),
      },
    ]);
    prisma.transaction.groupBy.mockResolvedValue([
      { type: 'income', _sum: { amount: new Decimal(50) } },
      { type: 'expense', _sum: { amount: new Decimal(20) } },
    ]);

    const result = await service.findAll('user-1');
    expect(result).toHaveLength(1);
    expect(result[0].balance.toString()).toBe('130');
  });
});
