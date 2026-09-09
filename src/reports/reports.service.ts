import { Injectable } from '@nestjs/common';
import { CarteirasService } from '../carteiras/carteiras.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { MetasService } from '../metas/metas.service';
import { OrcamentosService } from '../orcamentos/orcamentos.service';
import type { ExportReportDto } from './dto/export-report.dto';
import { renderReportExcel } from './excel.renderer';
import { renderReportPdf } from './pdf.renderer';
import type {
  ReportCarteiraRow,
  ReportMetaRow,
  ReportOrcamentoRow,
  ReportPayload,
} from './report.types';
import { toNumber } from './report.types';

@Injectable()
export class ReportsService {
  constructor(
    private readonly metasService: MetasService,
    private readonly orcamentosService: OrcamentosService,
    private readonly carteirasService: CarteirasService,
    private readonly dashboardService: DashboardService,
  ) {}

  async export(userId: string, dto: ExportReportDto) {
    const payload = await this.buildPayload(userId, dto);
    const stamp = new Date().toISOString().slice(0, 10);
    const baseName = `valora-relatorio-${stamp}`;

    if (dto.format === 'pdf') {
      const buffer = await renderReportPdf(payload);
      return {
        buffer,
        filename: `${baseName}.pdf`,
        contentType: 'application/pdf',
      };
    }

    const buffer = await renderReportExcel(payload);
    return {
      buffer,
      filename: `${baseName}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private async buildPayload(userId: string, dto: ExportReportDto): Promise<ReportPayload> {
    const payload: ReportPayload = {
      generatedAt: new Date(),
      types: dto.types,
    };

    const tasks: Promise<void>[] = [];

    if (dto.types.includes('metas')) {
      tasks.push(
        this.metasService.findAll(userId).then((metas) => {
          payload.metas = metas.map(
            (meta): ReportMetaRow => ({
              nome: meta.nome,
              descricao: meta.descricao,
              valorObjetivo: toNumber(meta.valorObjetivo),
              valorAtual: toNumber(meta.valorAtual),
              percentual: meta.percentual,
              dataInicio: meta.dataInicio,
              dataFim: meta.dataFim,
            }),
          );
        }),
      );
    }

    if (dto.types.includes('orcamentos')) {
      tasks.push(
        this.orcamentosService.findAll(userId).then((orcamentos) => {
          payload.orcamentos = orcamentos.map(
            (o): ReportOrcamentoRow => ({
              nome: o.nome,
              mes: o.mes,
              ano: o.ano,
              valorTotal: toNumber(o.valorTotal),
              totalGasto: toNumber(o.totalGasto),
              status: o.status,
              categorias: o.categorias.map((c) => ({
                categoriaNome: c.categoria?.nome ?? 'Sem categoria',
                limite: toNumber(c.limite),
                valorGasto: toNumber(c.valorGasto),
                percentual: c.percentual,
                status: c.status,
              })),
            }),
          );
        }),
      );
    }

    if (dto.types.includes('carteiras')) {
      tasks.push(
        this.carteirasService.findAll(userId).then((carteiras) => {
          payload.carteiras = carteiras.map(
            (c): ReportCarteiraRow => ({
              nome: c.nome,
              descricao: c.descricao,
              saldoAtual: toNumber(c.saldoAtual),
              dataCriacao: c.dataCriacao,
              ativo: c.ativo,
            }),
          );
        }),
      );
    }

    if (dto.types.includes('dashboard')) {
      tasks.push(
        this.dashboardService.summary(userId, { from: dto.from, to: dto.to }).then((summary) => {
          payload.dashboard = {
            period: summary.period,
            totals: {
              income: toNumber(summary.totals.income),
              expense: toNumber(summary.totals.expense),
              net: toNumber(summary.totals.net),
              balance: toNumber(summary.totals.balance),
            },
            expensesByCategory: summary.expensesByCategory.map((c) => ({
              categoryName: c.categoryName,
              amount: toNumber(c.amount),
            })),
            recentTransactions: summary.recentTransactions.map((t) => ({
              descricao: t.descricao,
              tipo: t.tipo,
              valor: toNumber(t.valor),
              dataTransacao: t.dataTransacao,
              carteiraNome: t.carteira?.nome ?? '—',
              categoriaNome: t.categoria?.nome ?? '—',
            })),
          };
        }),
      );
    }

    await Promise.all(tasks);
    return payload;
  }
}
