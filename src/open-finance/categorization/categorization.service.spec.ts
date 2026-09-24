import { CategorizationService } from './categorization.service';

describe('CategorizationService', () => {
  const prisma = {
    categoria: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new CategorizationService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reuses a category with the same name ignoring accents', async () => {
    prisma.categoria.findMany.mockResolvedValue([
      { id: 'cat-1', nome: 'Alimentacao', tipo: 'DESPESA', ativo: true },
    ]);

    const id = await service.resolveCategoryId('user-a', 'IFOOD *PEDIDO', 'DESPESA');

    expect(id).toBe('cat-1');
    expect(prisma.categoria.create).not.toHaveBeenCalled();
  });

  it('reuses Salário instead of creating Receita', async () => {
    prisma.categoria.findMany.mockResolvedValue([
      { id: 'cat-sal', nome: 'Salário', tipo: 'RECEITA', ativo: true },
    ]);

    const id = await service.resolveCategoryId('user-a', 'SALARIO EMPRESA', 'RECEITA');

    expect(id).toBe('cat-sal');
    expect(prisma.categoria.create).not.toHaveBeenCalled();
  });

  it('creates only when the user has no matching category', async () => {
    prisma.categoria.findMany.mockResolvedValue([]);
    prisma.categoria.create.mockResolvedValue({ id: 'cat-new' });

    const id = await service.resolveCategoryId('user-a', 'IFOOD *PEDIDO', 'DESPESA');

    expect(id).toBe('cat-new');
    expect(prisma.categoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nome: 'Alimentação',
          tipo: 'DESPESA',
          cor: '#f97316',
        }),
      }),
    );
  });

  it('updates color when reusing a category with a different palette', async () => {
    prisma.categoria.findMany.mockResolvedValue([
      { id: 'cat-1', nome: 'Alimentação', tipo: 'DESPESA', ativo: true, cor: '#64748b' },
    ]);
    prisma.categoria.update.mockResolvedValue({});

    await service.resolveCategoryId('user-a', 'IFOOD *PEDIDO', 'DESPESA');

    expect(prisma.categoria.update).toHaveBeenCalledWith({
      where: { id: 'cat-1' },
      data: { cor: '#f97316' },
    });
  });
});
