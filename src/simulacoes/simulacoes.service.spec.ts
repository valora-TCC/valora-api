import { SimulacoesService, aliquotaIr, aliquotaIof } from './simulacoes.service';
import { anualizarCdiDiario } from '../market/market.service';

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
      produto: 'compostos',
    });

    expect(result.resultadoBruto).toBeGreaterThan(1000);
    expect(result.juros).toBeCloseTo(result.resultadoBruto - 1000, 2);
    expect(result.tipoCalculo).toBe('compostos');
    expect(result.resultadoFinal).toBe(result.resultadoLiquido);
  });

  it('calculates juros simples without tax (educativo)', () => {
    const result = service.preview({
      valorInicial: 1000,
      taxaJuros: 12,
      tipoCalculo: 'simples',
      tempoMeses: 12,
      periodoTaxa: 'aa',
      produto: 'simples',
    });

    expect(result.resultadoBruto).toBe(1120);
    expect(result.juros).toBe(120);
    expect(result.iof).toBe(0);
    expect(result.ir).toBe(0);
    expect(result.resultadoLiquido).toBe(1120);
  });

  it('applies IOF before IR when holding period is under 30 days', () => {
    const calc = (
      service as unknown as {
        calcularTributacao: (
          juros: number,
          dias: number,
          produto: 'cdb',
        ) => { iof: number; ir: number; aliquotaIof: number; aliquotaIr: number };
      }
    ).calcularTributacao.bind(service);

    const result = calc(1000, 15, 'cdb');
    expect(result.aliquotaIof).toBe(0.5);
    expect(result.iof).toBe(500);
    expect(result.aliquotaIr).toBe(0.225);
    expect(result.ir).toBeCloseTo(500 * 0.225, 2);
  });

  it('uses IR regressive brackets by days held', () => {
    expect(aliquotaIr(90)).toBe(0.225);
    expect(aliquotaIr(200)).toBe(0.2);
    expect(aliquotaIr(400)).toBe(0.175);
    expect(aliquotaIr(800)).toBe(0.15);
    expect(aliquotaIof(1)).toBe(0.96);
    expect(aliquotaIof(15)).toBe(0.5);
    expect(aliquotaIof(30)).toBe(0);
  });

  it('applies IR regressivo on CDB after 12 months (no IOF)', () => {
    const result = service.preview({
      valorInicial: 1000,
      taxaJuros: 12,
      tipoCalculo: 'compostos',
      tempoMeses: 12,
      periodoTaxa: 'aa',
      produto: 'cdb',
    });

    expect(result.aliquotaIof).toBe(0);
    expect(result.aliquotaIr).toBe(0.2); // 360 dias → 20%
    expect(result.iof).toBe(0);
    expect(result.ir).toBeCloseTo(result.juros * 0.2, 2);
    expect(result.resultadoLiquido).toBeCloseTo(result.resultadoBruto - result.ir, 2);
  });

  it('exempts LCI/LCA and poupanca from IR and IOF', () => {
    for (const produto of ['lci_lca', 'poupanca'] as const) {
      const result = service.preview({
        valorInicial: 1000,
        taxaJuros: 12,
        tipoCalculo: 'compostos',
        tempoMeses: 12,
        periodoTaxa: 'aa',
        produto,
      });
      expect(result.iof).toBe(0);
      expect(result.ir).toBe(0);
      expect(result.resultadoLiquido).toBe(result.resultadoBruto);
    }
  });

  it('returns suggested taxas including IPCA, IGPM and poupanca', async () => {
    marketService.getTaxaByNome.mockImplementation(async (nome: string) => {
      const map: Record<string, { nome: string; valorPercentual: number; periodo: string }> = {
        SELIC: { nome: 'SELIC', valorPercentual: 13.25, periodo: 'aa' },
        CDI: { nome: 'CDI', valorPercentual: 13.15, periodo: 'aa' },
        IPCA: { nome: 'IPCA', valorPercentual: 0.4, periodo: 'mensal' },
        IGPM: { nome: 'IGPM', valorPercentual: 0.3, periodo: 'mensal' },
        POUPANCA: { nome: 'POUPANCA', valorPercentual: 0.5, periodo: 'mensal' },
      };
      const row = map[nome];
      if (!row) return null;
      return {
        ...row,
        fonte: 'BCB',
        dataAtualizacao: new Date().toISOString(),
        referencia: false,
      };
    });

    const result = await service.taxasSugeridas();
    expect(result.selic?.valorPercentual).toBe(13.25);
    expect(result.cdi?.valorPercentual).toBe(13.15);
    expect(result.ipca?.valorPercentual).toBe(0.4);
    expect(result.igpm?.valorPercentual).toBe(0.3);
    expect(result.poupanca?.valorPercentual).toBe(0.5);
    expect(result.fonte).toContain('Banco Central');
  });

  it('persists simulation with líquido as resultadoFinal', async () => {
    prisma.simulacaoJuros.create.mockImplementation(
      async ({ data }: { data: { resultadoFinal: number } }) => ({
        id: 's1',
        nome: 'Teste',
        valorInicial: 1000,
        taxaJuros: 10,
        tipoTaxa: 'cdb',
        tempoMeses: 12,
        resultadoFinal: data.resultadoFinal,
        dataSimulacao: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );

    const created = await service.create('user-1', {
      nome: 'Teste',
      valorInicial: 1000,
      taxaJuros: 10,
      tipoTaxa: 'cdb',
      tempoMeses: 12,
      produto: 'cdb',
    });

    expect(prisma.simulacaoJuros.create).toHaveBeenCalled();
    expect(created.id).toBe('s1');
    expect(created.resultadoFinal).toBeLessThan(
      service.preview({
        valorInicial: 1000,
        taxaJuros: 10,
        tipoCalculo: 'compostos',
        tempoMeses: 12,
        produto: 'compostos',
      }).resultadoBruto,
    );
  });
});

describe('anualizarCdiDiario', () => {
  it('converts daily CDI to annual equivalent', () => {
    const daily = 0.05; // 0.05% a.d.
    const annual = anualizarCdiDiario(daily);
    expect(annual).toBeCloseTo((Math.pow(1.0005, 252) - 1) * 100, 6);
    expect(annual).toBeGreaterThan(10);
    expect(annual).toBeLessThan(20);
  });
});
