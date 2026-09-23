export type ReportType = 'metas' | 'orcamentos' | 'carteiras' | 'dashboard';

export type ReportMetaRow = {
  nome: string;
  descricao: string | null;
  valorObjetivo: number;
  valorAtual: number;
  percentual: number;
  dataInicio: Date | string;
  dataFim: Date | string;
};

export type ReportOrcamentoCategoriaRow = {
  categoriaNome: string;
  limite: number;
  valorGasto: number;
  percentual: number;
  status: string;
};

export type ReportOrcamentoRow = {
  nome: string;
  mes: number;
  ano: number;
  valorTotal: number;
  totalGasto: number;
  status: string;
  categorias: ReportOrcamentoCategoriaRow[];
};

export type ReportCarteiraRow = {
  nome: string;
  descricao: string | null;
  saldoAtual: number;
  dataCriacao: Date;
  ativo: boolean;
};

export type ReportDashboardData = {
  period: { from: Date; to: Date };
  totals: {
    income: number;
    expense: number;
    net: number;
    balance: number;
  };
  expensesByCategory: Array<{ categoryName: string; amount: number }>;
  recentTransactions: Array<{
    descricao: string;
    tipo: string;
    valor: number;
    dataTransacao: Date;
    carteiraNome: string;
    categoriaNome: string;
  }>;
};

export type ReportPayload = {
  generatedAt: Date;
  types: ReportType[];
  metas?: ReportMetaRow[];
  orcamentos?: ReportOrcamentoRow[];
  carteiras?: ReportCarteiraRow[];
  dashboard?: ReportDashboardData;
};

export function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

export function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/** Timestamps shown in America/Sao_Paulo. */
export function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(date);
}

/** `@db.Date` values stored as UTC midnight — use UTC calendar day. */
export function formatDateOnly(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date);
}
