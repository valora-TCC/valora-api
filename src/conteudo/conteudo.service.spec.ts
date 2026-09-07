import { NotFoundException } from '@nestjs/common';
import { ConteudoService } from './conteudo.service';

describe('ConteudoService', () => {
  const prisma = {
    conteudo: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    usuarioConteudo: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const service = new ConteudoService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps list items with progresso', async () => {
    prisma.conteudo.findMany.mockResolvedValue([
      {
        id: 'c1',
        titulo: 'Selic',
        descricao: 'desc',
        corpo: 'corpo',
        nivel: 'iniciante',
        tipo: 'article',
        slug: 'selic',
        ordem: 1,
        url: null,
        capaUrl: null,
        dataPublicacao: new Date('2026-01-01T00:00:00.000Z'),
        ativo: true,
        usuarios: [
          {
            progresso: 40,
            concluido: false,
            dataAcesso: new Date('2026-01-02T00:00:00.000Z'),
          },
        ],
      },
    ]);

    const result = await service.findAll('user-1');
    expect(result).toHaveLength(1);
    expect(result[0].progresso?.valor).toBe(40);
    expect(result[0].corpo).toBeUndefined();
  });

  it('throws when conteúdo missing', async () => {
    prisma.conteudo.findFirst.mockResolvedValue(null);
    await expect(service.findOne('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates progresso and marks concluido at 100', async () => {
    prisma.conteudo.findFirst.mockResolvedValue({ id: 'c1', ativo: true });
    prisma.usuarioConteudo.upsert.mockResolvedValue({
      progresso: 100,
      concluido: true,
      dataAcesso: new Date('2026-01-03T00:00:00.000Z'),
    });

    const result = await service.updateProgresso('user-1', 'c1', { concluido: true });
    expect(result.concluido).toBe(true);
    expect(result.progresso).toBe(100);
  });
});
