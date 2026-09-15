import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketService } from '../market/market.service';
import type {
  CreateSimulacaoDto,
  PreviewSimulacaoDto,
  ProdutoSimulacao,
} from './dto/simulacao.dto';

/** Tabela IOF regressiva (Decreto 6.306/2007) — alíquota sobre o rendimento, dias 1–29. */
const IOF_TABELA: readonly number[] = [
  0.96, 0.93, 0.9, 0.86, 0.83, 0.8, 0.76, 0.73, 0.7, 0.66, 0.63, 0.6, 0.56, 0.53, 0.5, 0.46, 0.43,
  0.4, 0.36, 0.33, 0.3, 0.26, 0.23, 0.2, 0.16, 0.13, 0.1, 0.06, 0.03,
];

export function aliquotaIr(dias: number): number {
  if (dias <= 180) return 0.225;
  if (dias <= 360) return 0.2;
  if (dias <= 720) return 0.175;
  return 0.15;
}

export function aliquotaIof(dias: number): number {
  if (dias <= 0) return IOF_TABELA[0]!;
  if (dias >= 30) return 0;
  return IOF_TABELA[dias - 1] ?? 0;
}

function produtoIsento(produto: ProdutoSimulacao): boolean {
  return produto === 'lci_lca' || produto === 'poupanca' || produto === 'simples';
}

function resolveProduto(
  produto: ProdutoSimulacao | undefined,
  tipoCalculo: 'simples' | 'compostos',
  tipoTaxa?: string,
): ProdutoSimulacao {
  if (produto) return produto;
  if (tipoTaxa === 'simples' || tipoCalculo === 'simples') return 'simples';
  if (
    tipoTaxa === 'lci_lca' ||
    tipoTaxa === 'poupanca' ||
    tipoTaxa === 'cdb' ||
    tipoTaxa === 'tesouro'
  ) {
    return tipoTaxa;
  }
  return 'compostos';
}

@Injectable()
export class SimulacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketService: MarketService,
  ) {}

  async findAll(userId: string) {
    const rows = await this.prisma.simulacaoJuros.findMany({
      where: { idUsuario: userId },
      orderBy: { dataSimulacao: 'desc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async findOne(userId: string, id: string) {
    const row = await this.prisma.simulacaoJuros.findFirst({
      where: { id, idUsuario: userId },
    });
    if (!row) throw new NotFoundException('Simulação não encontrada');
    return this.toDto(row);
  }

  async create(userId: string, dto: CreateSimulacaoDto) {
    const tipoCalculo =
      dto.tipoTaxa === 'simples' || dto.produto === 'simples' ? 'simples' : 'compostos';
    const produto = resolveProduto(dto.produto, tipoCalculo, dto.tipoTaxa);
    const resultado = this.calcular({
      valorInicial: dto.valorInicial,
      taxaJuros: dto.taxaJuros,
      tipoCalculo,
      tempoMeses: dto.tempoMeses,
      periodoTaxa: 'aa',
      produto,
    });

    const row = await this.prisma.simulacaoJuros.create({
      data: {
        idUsuario: userId,
        nome: dto.nome,
        valorInicial: dto.valorInicial,
        taxaJuros: dto.taxaJuros,
        tipoTaxa: dto.tipoTaxa,
        tempoMeses: dto.tempoMeses,
        resultadoFinal: resultado.resultadoFinal,
      },
    });

    return this.toDto(row);
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.simulacaoJuros.findFirst({
      where: { id, idUsuario: userId },
    });
    if (!row) throw new NotFoundException('Simulação não encontrada');
    await this.prisma.simulacaoJuros.delete({ where: { id } });
    return { ok: true };
  }

  preview(dto: PreviewSimulacaoDto) {
    const produto = resolveProduto(dto.produto, dto.tipoCalculo);
    return this.calcular({
      ...dto,
      produto,
    });
  }

  async taxasSugeridas() {
    const [selic, cdi, ipca, igpm, poupanca] = await Promise.all([
      this.marketService.getTaxaByNome('SELIC'),
      this.marketService.getTaxaByNome('CDI'),
      this.marketService.getTaxaByNome('IPCA'),
      this.marketService.getTaxaByNome('IGPM'),
      this.marketService.getTaxaByNome('POUPANCA'),
    ]);

    return {
      selic,
      cdi,
      ipca,
      igpm,
      poupanca,
      fonte: 'Banco Central do Brasil (SGS)',
      atualizadoEm: new Date().toISOString(),
    };
  }

  private calcular(input: {
    valorInicial: number;
    taxaJuros: number;
    tipoCalculo: 'simples' | 'compostos';
    tempoMeses: number;
    periodoTaxa?: 'aa' | 'am';
    produto: ProdutoSimulacao;
  }) {
    const periodo = input.periodoTaxa ?? 'aa';
    const taxaMensal =
      periodo === 'am' ? input.taxaJuros / 100 : Math.pow(1 + input.taxaJuros / 100, 1 / 12) - 1;

    let resultadoBruto: number;
    if (input.tipoCalculo === 'simples' || input.produto === 'simples') {
      const taxaAa =
        periodo === 'aa' ? input.taxaJuros / 100 : Math.pow(1 + input.taxaJuros / 100, 12) - 1;
      resultadoBruto = input.valorInicial * (1 + taxaAa * (input.tempoMeses / 12));
    } else {
      resultadoBruto = input.valorInicial * Math.pow(1 + taxaMensal, input.tempoMeses);
    }

    const juros = resultadoBruto - input.valorInicial;
    const dias = Math.max(1, Math.round(input.tempoMeses * 30));
    const tributacao = this.calcularTributacao(juros, dias, input.produto);
    const resultadoLiquido = Number((resultadoBruto - tributacao.iof - tributacao.ir).toFixed(2));

    return {
      valorInicial: input.valorInicial,
      taxaJuros: input.taxaJuros,
      tipoCalculo:
        input.tipoCalculo === 'simples' || input.produto === 'simples'
          ? ('simples' as const)
          : ('compostos' as const),
      tempoMeses: input.tempoMeses,
      periodoTaxa: periodo,
      produto: input.produto,
      resultadoBruto: Number(resultadoBruto.toFixed(2)),
      juros: Number(juros.toFixed(2)),
      iof: tributacao.iof,
      ir: tributacao.ir,
      aliquotaIof: tributacao.aliquotaIof,
      aliquotaIr: tributacao.aliquotaIr,
      resultadoLiquido,
      /** Valor final líquido (tributado) ou bruto (isento/simples). */
      resultadoFinal: resultadoLiquido,
    };
  }

  private calcularTributacao(juros: number, dias: number, produto: ProdutoSimulacao) {
    if (produtoIsento(produto) || juros <= 0) {
      return { iof: 0, ir: 0, aliquotaIof: 0, aliquotaIr: 0 };
    }

    const aliIof = aliquotaIof(dias);
    const iof = Number((juros * aliIof).toFixed(2));
    const baseIr = Math.max(0, juros - iof);
    const aliIr = aliquotaIr(dias);
    const ir = Number((baseIr * aliIr).toFixed(2));

    return {
      iof,
      ir,
      aliquotaIof: aliIof,
      aliquotaIr: aliIr,
    };
  }

  private toDto(row: {
    id: string;
    nome: string;
    valorInicial: unknown;
    taxaJuros: unknown;
    tipoTaxa: string;
    tempoMeses: number;
    resultadoFinal: unknown;
    dataSimulacao: Date;
  }) {
    return {
      id: row.id,
      nome: row.nome,
      valorInicial: Number(row.valorInicial),
      taxaJuros: Number(row.taxaJuros),
      tipoTaxa: row.tipoTaxa,
      tempoMeses: row.tempoMeses,
      resultadoFinal: Number(row.resultadoFinal),
      dataSimulacao: row.dataSimulacao.toISOString(),
    };
  }
}
