import { Decimal } from '@prisma/client/runtime/library';
import { BadRequestException } from '@nestjs/common';
import { InvestmentsService } from './investments.service';

describe('InvestmentsService', () => {
  const prisma = {
    investment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    investmentTransaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const usersService = {
    getOrCreateMe: jest.fn(),
  };

  const service = new InvestmentsService(prisma as never, usersService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid investment transaction kind', async () => {
    prisma.investment.findFirst.mockResolvedValue({
      id: 'inv-1',
      userId: 'user-1',
      quantity: new Decimal(10),
      averagePrice: new Decimal(20),
      transactions: [],
    });

    await expect(
      service.addTransaction('user-1', {
        investmentId: 'inv-1',
        kind: 'invalid',
        quantity: 1,
        unitPrice: 10,
        occurredAt: new Date().toISOString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
