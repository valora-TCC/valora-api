import type { ReportPayload } from './report.types';
import { formatBrl, formatDate } from './report.types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return '<p class="empty">Nenhum registro.</p>';
  }
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function buildReportHtml(payload: ReportPayload): string {
  const sections: string[] = [];

  if (payload.metas) {
    sections.push(`
      <section>
        <h2>Metas</h2>
        ${table(
          ['Nome', 'Descrição', 'Objetivo', 'Atual', '%', 'Início', 'Fim'],
          payload.metas.map((m) => [
            escapeHtml(m.nome),
            escapeHtml(m.descricao ?? '—'),
            formatBrl(m.valorObjetivo),
            formatBrl(m.valorAtual),
            `${m.percentual.toFixed(2)}%`,
            formatDate(m.dataInicio),
            formatDate(m.dataFim),
          ]),
        )}
      </section>
    `);
  }

  if (payload.orcamentos) {
    const orcamentoBlocks = payload.orcamentos
      .map((o) => {
        const cats =
          o.categorias.length === 0
            ? '<p class="empty">Sem categorias.</p>'
            : table(
                ['Categoria', 'Limite', 'Gasto', '%', 'Status'],
                o.categorias.map((c) => [
                  escapeHtml(c.categoriaNome),
                  formatBrl(c.limite),
                  formatBrl(c.valorGasto),
                  `${c.percentual.toFixed(2)}%`,
                  escapeHtml(c.status),
                ]),
              );
        return `
          <div class="block">
            <h3>${escapeHtml(o.nome)} — ${String(o.mes).padStart(2, '0')}/${o.ano}</h3>
            <p>Total: ${formatBrl(o.valorTotal)} · Gasto: ${formatBrl(o.totalGasto)} · Status: ${escapeHtml(o.status)}</p>
            ${cats}
          </div>
        `;
      })
      .join('');
    sections.push(`
      <section>
        <h2>Orçamentos</h2>
        ${payload.orcamentos.length === 0 ? '<p class="empty">Nenhum registro.</p>' : orcamentoBlocks}
      </section>
    `);
  }

  if (payload.carteiras) {
    sections.push(`
      <section>
        <h2>Carteiras</h2>
        ${table(
          ['Nome', 'Descrição', 'Saldo', 'Criada em', 'Ativa'],
          payload.carteiras.map((c) => [
            escapeHtml(c.nome),
            escapeHtml(c.descricao ?? '—'),
            formatBrl(c.saldoAtual),
            formatDate(c.dataCriacao),
            c.ativo ? 'Sim' : 'Não',
          ]),
        )}
      </section>
    `);
  }

  if (payload.dashboard) {
    const d = payload.dashboard;
    sections.push(`
      <section>
        <h2>Dashboard</h2>
        <p>Período: ${formatDate(d.period.from)} — ${formatDate(d.period.to)}</p>
        <ul class="totals">
          <li>Receitas: ${formatBrl(d.totals.income)}</li>
          <li>Despesas: ${formatBrl(d.totals.expense)}</li>
          <li>Saldo do período: ${formatBrl(d.totals.net)}</li>
          <li>Saldo nas carteiras: ${formatBrl(d.totals.balance)}</li>
        </ul>
        <h3>Despesas por categoria</h3>
        ${table(
          ['Categoria', 'Valor'],
          d.expensesByCategory.map((c) => [escapeHtml(c.categoryName), formatBrl(c.amount)]),
        )}
        <h3>Transações recentes</h3>
        ${table(
          ['Data', 'Descrição', 'Tipo', 'Valor', 'Carteira', 'Categoria'],
          d.recentTransactions.map((t) => [
            formatDate(t.dataTransacao),
            escapeHtml(t.descricao),
            escapeHtml(t.tipo),
            formatBrl(t.valor),
            escapeHtml(t.carteiraNome),
            escapeHtml(t.categoriaNome),
          ]),
        )}
      </section>
    `);
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório Valora</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; margin: 32px; font-size: 12px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 28px 0 12px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    h3 { font-size: 13px; margin: 16px 0 8px; }
    .meta { color: #555; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #e0e0e0; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .empty { color: #777; font-style: italic; }
    .totals { list-style: none; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
    .block { margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>Valora</h1>
  <p class="meta">Relatório gerado em ${formatDate(payload.generatedAt)} · ${escapeHtml(payload.types.join(', '))}</p>
  ${sections.join('\n')}
</body>
</html>`;
}

export async function renderReportPdf(payload: ReportPayload): Promise<Buffer> {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(buildReportHtml(payload), { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
