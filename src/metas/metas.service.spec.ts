import { Prisma } from '../prisma/client';
import { BadRequestException } from '@nestjs/common';
import { MetasService } from './metas.service';

describe('MetasService', () => {
  const prisma = {
    meta: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    progressoMeta: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const usersService = { getOrCreateMe: jest.fn() };
  const service = new MetasService(prisma as never, usersService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects periodo invertido', async () => {
    await expect(
      service.create('user-1', {
        nome: 'Meta',
        valorObjetivo: 100,
        dataInicio: '2026-12-01',
        dataFim: '2026-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adds percentual when listing', async () => {
    prisma.meta.findMany.mockResolvedValue([
      {
        id: 'm1',
        valorAtual: new Prisma.Decimal(25),
        valorObjetivo: new Prisma.Decimal(100),
        dataInicio: new Date('2026-01-01T12:00:00.000Z'),
        dataFim: new Date('2026-12-31T12:00:00.000Z'),
        progressos: [],
      },
    ]);
    const result = await service.findAll('user-1');
    expect(result[0].percentual).toBe(25);
    expect(result[0].dataInicio).toBe('2026-01-01');
    expect(result[0].dataFim).toBe('2026-12-31');
  });
});
