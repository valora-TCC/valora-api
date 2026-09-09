import ExcelJS from 'exceljs';
import type { ReportPayload } from './report.types';
import { formatDate } from './report.types';

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
}

export async function renderReportExcel(payload: ReportPayload): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Valora';
  workbook.created = payload.generatedAt;

  if (payload.metas) {
    const sheet = workbook.addWorksheet('Metas');
    sheet.columns = [
      { header: 'Nome', key: 'nome', width: 28 },
      { header: 'Descrição', key: 'descricao', width: 36 },
      { header: 'Objetivo', key: 'valorObjetivo', width: 14 },
      { header: 'Atual', key: 'valorAtual', width: 14 },
      { header: '%', key: 'percentual', width: 10 },
      { header: 'Início', key: 'dataInicio', width: 14 },
      { header: 'Fim', key: 'dataFim', width: 14 },
    ];
    styleHeader(sheet.getRow(1));
    for (const meta of payload.metas) {
      sheet.addRow({
        nome: meta.nome,
        descricao: meta.descricao ?? '',
        valorObjetivo: meta.valorObjetivo,
        valorAtual: meta.valorAtual,
        percentual: meta.percentual,
        dataInicio: formatDate(meta.dataInicio),
        dataFim: formatDate(meta.dataFim),
      });
    }
  }

  if (payload.orcamentos) {
    const sheet = workbook.addWorksheet('Orcamentos');
    sheet.columns = [
      { header: 'Orçamento', key: 'orcamento', width: 24 },
      { header: 'Mês', key: 'mes', width: 8 },
      { header: 'Ano', key: 'ano', width: 8 },
      { header: 'Valor total', key: 'valorTotal', width: 14 },
      { header: 'Total gasto', key: 'totalGasto', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Categoria', key: 'categoria', width: 22 },
      { header: 'Limite', key: 'limite', width: 12 },
      { header: 'Gasto', key: 'gasto', width: 12 },
      { header: '% categoria', key: 'percentual', width: 12 },
      { header: 'Status categoria', key: 'statusCat', width: 14 },
    ];
    styleHeader(sheet.getRow(1));
    for (const o of payload.orcamentos) {
      if (o.categorias.length === 0) {
        sheet.addRow({
          orcamento: o.nome,
          mes: o.mes,
          ano: o.ano,
          valorTotal: o.valorTotal,
          totalGasto: o.totalGasto,
          status: o.status,
        });
        continue;
      }
      for (const c of o.categorias) {
        sheet.addRow({
          orcamento: o.nome,
          mes: o.mes,
          ano: o.ano,
          valorTotal: o.valorTotal,
          totalGasto: o.totalGasto,
          status: o.status,
          categoria: c.categoriaNome,
          limite: c.limite,
          gasto: c.valorGasto,
          percentual: c.percentual,
          statusCat: c.status,
        });
      }
    }
  }

  if (payload.carteiras) {
    const sheet = workbook.addWorksheet('Carteiras');
    sheet.columns = [
      { header: 'Nome', key: 'nome', width: 28 },
      { header: 'Descrição', key: 'descricao', width: 36 },
      { header: 'Saldo', key: 'saldoAtual', width: 14 },
      { header: 'Criada em', key: 'dataCriacao', width: 14 },
      { header: 'Ativa', key: 'ativo', width: 10 },
    ];
    styleHeader(sheet.getRow(1));
    for (const c of payload.carteiras) {
      sheet.addRow({
        nome: c.nome,
        descricao: c.descricao ?? '',
        saldoAtual: c.saldoAtual,
        dataCriacao: formatDate(c.dataCriacao),
        ativo: c.ativo ? 'Sim' : 'Não',
      });
    }
  }

  if (payload.dashboard) {
    const d = payload.dashboard;
    const sheet = workbook.addWorksheet('Dashboard');
    sheet.addRow(['Período', `${formatDate(d.period.from)} — ${formatDate(d.period.to)}`]);
    sheet.addRow(['Receitas', d.totals.income]);
    sheet.addRow(['Despesas', d.totals.expense]);
    sheet.addRow(['Saldo do período', d.totals.net]);
    sheet.addRow(['Saldo nas carteiras', d.totals.balance]);
    sheet.addRow([]);
    sheet.addRow(['Despesas por categoria']);
    styleHeader(sheet.addRow(['Categoria', 'Valor']));
    for (const c of d.expensesByCategory) {
      sheet.addRow([c.categoryName, c.amount]);
    }
    sheet.addRow([]);
    sheet.addRow(['Transações recentes']);
    styleHeader(sheet.addRow(['Data', 'Descrição', 'Tipo', 'Valor', 'Carteira', 'Categoria']));
    for (const t of d.recentTransactions) {
      sheet.addRow([
        formatDate(t.dataTransacao),
        t.descricao,
        t.tipo,
        t.valor,
        t.carteiraNome,
        t.categoriaNome,
      ]);
    }
    sheet.getColumn(1).width = 22;
    sheet.getColumn(2).width = 28;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 14;
    sheet.getColumn(5).width = 18;
    sheet.getColumn(6).width = 18;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
