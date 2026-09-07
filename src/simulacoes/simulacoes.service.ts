import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketService } from '../market/market.service';
import type { CreateSimulacaoDto, PreviewSimulacaoDto } from './dto/simulacao.dto';

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
    const tipoCalculo = dto.tipoTaxa === 'simples' ? 'simples' : 'compostos';
    const resultado = this.calcular({
      valorInicial: dto.valorInicial,
      taxaJuros: dto.taxaJuros,
      tipoCalculo,
      tempoMeses: dto.tempoMeses,
      periodoTaxa: 'aa',
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
    return this.calcular(dto);
  }

  async taxasSugeridas() {
    const [selic, cdi] = await Promise.all([
      this.marketService.getTaxaByNome('SELIC'),
      this.marketService.getTaxaByNome('CDI'),
    ]);

    return {
      selic,
      cdi,
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
  }) {
    const periodo = input.periodoTaxa ?? 'aa';
    const taxaMensal =
      periodo === 'am' ? input.taxaJuros / 100 : Math.pow(1 + input.taxaJuros / 100, 1 / 12) - 1;

    let resultadoFinal: number;
    if (input.tipoCalculo === 'simples') {
      const taxaAa =
        periodo === 'aa' ? input.taxaJuros / 100 : Math.pow(1 + input.taxaJuros / 100, 12) - 1;
      resultadoFinal = input.valorInicial * (1 + taxaAa * (input.tempoMeses / 12));
    } else {
      resultadoFinal = input.valorInicial * Math.pow(1 + taxaMensal, input.tempoMeses);
    }

    const juros = resultadoFinal - input.valorInicial;

    return {
      valorInicial: input.valorInicial,
      taxaJuros: input.taxaJuros,
      tipoCalculo: input.tipoCalculo,
      tempoMeses: input.tempoMeses,
      periodoTaxa: periodo,
      resultadoFinal: Number(resultadoFinal.toFixed(2)),
      juros: Number(juros.toFixed(2)),
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
