import { SimulacoesService } from './simulacoes.service';

describe('SimulacoesService', () => {
  const prisma = {
    simulacaoJuros: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const marketService = {
    getTaxaByNome: jest.fn(),
  };

  const service = new SimulacoesService(prisma as never, marketService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates juros compostos in preview', () => {
    const result = service.preview({
      valorInicial: 1000,
      taxaJuros: 12,
      tipoCalculo: 'compostos',
      tempoMeses: 12,
      periodoTaxa: 'aa',
    });

    expect(result.resultadoFinal).toBeGreaterThan(1000);
    expect(result.juros).toBeCloseTo(result.resultadoFinal - 1000, 2);
    expect(result.tipoCalculo).toBe('compostos');
  });

  it('calculates juros simples in preview', () => {
    const result = service.preview({
      valorInicial: 1000,
      taxaJuros: 12,
      tipoCalculo: 'simples',
      tempoMeses: 12,
      periodoTaxa: 'aa',
    });

    expect(result.resultadoFinal).toBe(1120);
    expect(result.juros).toBe(120);
  });

  it('returns suggested taxas from market service', async () => {
    marketService.getTaxaByNome.mockImplementation(async (nome: string) =>
      nome === 'SELIC'
        ? {
            nome: 'SELIC',
            valorPercentual: 13.25,
            fonte: 'BCB',
            dataAtualizacao: new Date().toISOString(),
            referencia: false,
            periodo: 'aa',
          }
        : {
            nome: 'CDI',
            valorPercentual: 13.15,
            fonte: 'BCB',
            dataAtualizacao: new Date().toISOString(),
            referencia: false,
            periodo: 'aa',
          },
    );

    const result = await service.taxasSugeridas();
    expect(result.selic?.valorPercentual).toBe(13.25);
    expect(result.cdi?.valorPercentual).toBe(13.15);
    expect(result.fonte).toContain('Banco Central');
  });

  it('persists simulation with calculated result', async () => {
    prisma.simulacaoJuros.create.mockResolvedValue({
      id: 's1',
      nome: 'Teste',
      valorInicial: 1000,
      taxaJuros: 10,
      tipoTaxa: 'compostos',
      tempoMeses: 12,
      resultadoFinal: 1104.71,
      dataSimulacao: new Date('2026-01-01T00:00:00.000Z'),
    });

    const created = await service.create('user-1', {
      nome: 'Teste',
      valorInicial: 1000,
      taxaJuros: 10,
      tipoTaxa: 'compostos',
      tempoMeses: 12,
    });

    expect(prisma.simulacaoJuros.create).toHaveBeenCalled();
    expect(created.id).toBe('s1');
    expect(created.resultadoFinal).toBeGreaterThan(1000);
  });
});
