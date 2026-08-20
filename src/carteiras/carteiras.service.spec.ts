import { Decimal } from '@prisma/client/runtime/library';
import { CarteirasService } from './carteiras.service';

describe('CarteirasService', () => {
  const prisma = {
    carteira: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const usersService = {
    getOrCreateMe: jest.fn(),
  };

  const service = new CarteirasService(prisma as never, usersService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists carteiras with persisted saldoAtual', async () => {
    prisma.carteira.findMany.mockResolvedValue([
      {
        id: 'cart-1',
        idUsuario: 'user-1',
        nome: 'Carteira',
        saldoAtual: new Decimal(130),
      },
    ]);

    const result = await service.findAll('user-1');
    expect(result).toHaveLength(1);
    expect(result[0].saldoAtual.toString()).toBe('130');
  });
});
