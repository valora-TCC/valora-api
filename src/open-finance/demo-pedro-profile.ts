import { normalizeLedgerName } from './ledger-identity';

export const DEMO_ALLOWED_CPF = '47017638883';
export const DEMO_ALLOWED_NAME = 'Pedro Gomes de Almeida';

export const DEMO_IDENTITY_ERROR =
  'Não foi possível conectar. CPF ou nome do titular não conferem.';

export const CREDIT_CARD_CATEGORY_HINT = 'CARTAO DE CREDITO NUBANK';

export type DemoAccountKind = 'checking' | 'credit_card';

export type DemoTransaction = {
  tipo: 'RECEITA' | 'DESPESA';
  descricao: string;
  valor: number;
  date: string;
  account: DemoAccountKind;
};

export type DemoPedroProfile = {
  checkingBalance: number;
  creditCardBalance: number;
  transactions: DemoTransaction[];
};

export const DEMO_PLANNING_TAG = 'Open Finance · Nubank';

export type DemoMetaSeed = {
  nome: string;
  descricao: string;
  valorObjetivo: number;
  valorAtual: number;
  dataInicio: string;
  dataFim: string;
  progressos: { data: string; valor: number; observacao: string }[];
};

export type DemoOrcamentoSeed = {
  mes: number;
  ano: number;
  nome: string;
  valorTotal: number;
  observacao: string;
  categorias: { hint: string; limite: number }[];
};

export const DEMO_INVESTMENT_TICKER_PREFIX = 'OF-';

export type DemoInvestmentSeed = {
  name: string;
  type: 'stock' | 'fund' | 'fixed_income' | 'crypto' | 'other';
  ticker: string;
  quantity: number;
  averagePrice: number;
  transactions: {
    kind: 'buy' | 'sell' | 'dividend';
    quantity: number;
    unitPrice: number;
    occurredAt: string;
    notes: string;
  }[];
};

export function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 3) return trimmed;
  return `${trimmed.slice(0, 3)}${'*'.repeat(Math.min(trimmed.length - 3, 8))}`;
}

export function normalizeDemoCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export function isAllowedDemoIdentity(cpf: string, fullName: string): boolean {
  const digits = normalizeDemoCpf(cpf);
  if (digits !== DEMO_ALLOWED_CPF) return false;
  return normalizeLedgerName(fullName) === normalizeLedgerName(DEMO_ALLOWED_NAME);
}

function pixRecebido(name: string, key: string): string {
  return `PIX RECEBIDO · ${maskSecret(name)} · ${maskSecret(key)}`;
}

function pixEnviado(name: string, key: string): string {
  return `PIX ENVIADO · ${maskSecret(name)} · ${maskSecret(key)}`;
}

function pixPhone(suffix: string): string {
  return `1699${suffix}`;
}

const NETFLIX_PRICE = 59.9;
const SPOTIFY_PRICE = 23.9;
const MONTHLY_TRANSFER = 2000;
const MONTHLY_INVESTMENT = 300;

const PAID_BILL_JUL = Number(
  (NETFLIX_PRICE + SPOTIFY_PRICE + 28.5 + 54.9 + 119.9).toFixed(2),
);
const PAID_BILL_AUG = Number(
  (NETFLIX_PRICE + SPOTIFY_PRICE + 22.4 + 41.8 + 67.2 + 189.9).toFixed(2),
);

export function buildPedroDemoProfile(): DemoPedroProfile {
  const transactions: DemoTransaction[] = [
    {
      tipo: 'RECEITA',
      descricao: pixRecebido('Conta Externa', 'ext.pedro.salario@email.com'),
      valor: MONTHLY_TRANSFER,
      date: '2026-07-05',
      account: 'checking',
    },
    {
      tipo: 'DESPESA',
      descricao: 'APLICACAO CDB NUBANK',
      valor: MONTHLY_INVESTMENT,
      date: '2026-07-10',
      account: 'checking',
    },
    {
      tipo: 'DESPESA',
      descricao: 'PAGAMENTO FATURA NUBANK',
      valor: PAID_BILL_JUL,
      date: '2026-07-12',
      account: 'checking',
    },
    {
      tipo: 'DESPESA',
      descricao: pixEnviado('Joao Silva', 'joao.silva@email.com'),
      valor: 150,
      date: '2026-07-18',
      account: 'checking',
    },
    {
      tipo: 'RECEITA',
      descricao: pixRecebido('Maria Souza', pixPhone('8765432')),
      valor: 80,
      date: '2026-07-22',
      account: 'checking',
    },
    {
      tipo: 'DESPESA',
      descricao: pixEnviado('Rafael Nunes', 'rafa.nunes@email.com'),
      valor: 45,
      date: '2026-07-25',
      account: 'checking',
    },
    {
      tipo: 'RECEITA',
      descricao: pixRecebido('Beatriz Rocha', pixPhone('7654321')),
      valor: 60,
      date: '2026-07-29',
      account: 'checking',
    },

    {
      tipo: 'RECEITA',
      descricao: pixRecebido('Conta Externa', 'ext.pedro.salario@email.com'),
      valor: MONTHLY_TRANSFER,
      date: '2026-08-05',
      account: 'checking',
    },
    {
      tipo: 'DESPESA',
      descricao: 'APLICACAO CDB NUBANK',
      valor: MONTHLY_INVESTMENT,
      date: '2026-08-10',
      account: 'checking',
    },
    {
      tipo: 'DESPESA',
      descricao: 'PAGAMENTO FATURA NUBANK',
      valor: PAID_BILL_AUG,
      date: '2026-08-12',
      account: 'checking',
    },
    {
      tipo: 'DESPESA',
      descricao: pixEnviado('Ana Costa', 'ana.costa@email.com'),
      valor: 200,
      date: '2026-08-15',
      account: 'checking',
    },
    {
      tipo: 'RECEITA',
      descricao: pixRecebido('Lucas Lima', 'lucasalima@email.com'),
      valor: 120,
      date: '2026-08-20',
      account: 'checking',
    },
    {
      tipo: 'DESPESA',
      descricao: pixEnviado('Carlos Dias', pixPhone('9887766')),
      valor: 50,
      date: '2026-08-28',
      account: 'checking',
    },
    {
      tipo: 'DESPESA',
      descricao: pixEnviado('Patricia Mello', 'pat.mello@email.com'),
      valor: 90,
      date: '2026-08-30',
      account: 'checking',
    },
    {
      tipo: 'RECEITA',
      descricao: pixRecebido('Diego Santos', pixPhone('8877665')),
      valor: 35,
      date: '2026-08-31',
      account: 'checking',
    },

    {
      tipo: 'RECEITA',
      descricao: pixRecebido('Conta Externa', 'ext.pedro.salario@email.com'),
      valor: MONTHLY_TRANSFER,
      date: '2026-09-05',
      account: 'checking',
    },
    {
      tipo: 'DESPESA',
      descricao: 'APLICACAO CDB NUBANK',
      valor: MONTHLY_INVESTMENT,
      date: '2026-09-10',
      account: 'checking',
    },
    {
      tipo: 'DESPESA',
      descricao: pixEnviado('Joao Silva', 'joao.silva@email.com'),
      valor: 180,
      date: '2026-09-08',
      account: 'checking',
    },
    {
      tipo: 'RECEITA',
      descricao: pixRecebido('Maria Souza', pixPhone('8765432')),
      valor: 95,
      date: '2026-09-12',
      account: 'checking',
    },
    {
      tipo: 'DESPESA',
      descricao: pixEnviado('Sofia Alves', 'sofia.alves@email.com'),
      valor: 75,
      date: '2026-09-14',
      account: 'checking',
    },
    {
      tipo: 'DESPESA',
      descricao: pixEnviado('Bruno Teixeira', 'bruno.tx@email.com'),
      valor: 120,
      date: '2026-09-15',
      account: 'checking',
    },
    {
      tipo: 'RECEITA',
      descricao: pixRecebido('Camila Freitas', pixPhone('6543210')),
      valor: 40,
      date: '2026-09-16',
      account: 'checking',
    },

    {
      tipo: 'DESPESA',
      descricao: 'NETFLIX PREMIUM',
      valor: NETFLIX_PRICE,
      date: '2026-09-05',
      account: 'credit_card',
    },
    {
      tipo: 'DESPESA',
      descricao: 'SPOTIFY PREMIUM',
      valor: SPOTIFY_PRICE,
      date: '2026-09-08',
      account: 'credit_card',
    },
    {
      tipo: 'DESPESA',
      descricao: 'UBER TRIP',
      valor: 24.5,
      date: '2026-09-03',
      account: 'credit_card',
    },
    {
      tipo: 'DESPESA',
      descricao: 'UBER TRIP',
      valor: 18.7,
      date: '2026-09-11',
      account: 'credit_card',
    },
    {
      tipo: 'DESPESA',
      descricao: '99 FOOD *PEDIDO',
      valor: 45.9,
      date: '2026-09-06',
      account: 'credit_card',
    },
    {
      tipo: 'DESPESA',
      descricao: 'IFOOD *PEDIDO',
      valor: 62.9,
      date: '2026-09-07',
      account: 'credit_card',
    },
    {
      tipo: 'DESPESA',
      descricao: 'NETSHOES',
      valor: 219.9,
      date: '2026-09-09',
      account: 'credit_card',
    },
    {
      tipo: 'DESPESA',
      descricao: 'MERCADO LIVRE',
      valor: 134.5,
      date: '2026-09-13',
      account: 'credit_card',
    },
  ];

  let checkingBalance = 0;
  let creditCardBalance = 0;
  for (const tx of transactions) {
    const signed = tx.tipo === 'RECEITA' ? tx.valor : -tx.valor;
    if (tx.account === 'checking') {
      checkingBalance += signed;
    } else {
      creditCardBalance += tx.tipo === 'DESPESA' ? tx.valor : -tx.valor;
    }
  }

  return {
    checkingBalance: Number(checkingBalance.toFixed(2)),
    creditCardBalance: Number(creditCardBalance.toFixed(2)),
    transactions,
  };
}

export function buildPedroDemoPlanning(): {
  metas: DemoMetaSeed[];
  orcamentos: DemoOrcamentoSeed[];
  investments: DemoInvestmentSeed[];
} {
  const metas: DemoMetaSeed[] = [
    {
      nome: 'Reserva de emergência',
      descricao: DEMO_PLANNING_TAG,
      valorObjetivo: 6000,
      valorAtual: 900,
      dataInicio: '2026-07-01',
      dataFim: '2026-12-31',
      progressos: [
        { data: '2026-07-10', valor: 300, observacao: 'Aplicação CDB Nubank' },
        { data: '2026-08-10', valor: 300, observacao: 'Aplicação CDB Nubank' },
        { data: '2026-09-10', valor: 300, observacao: 'Aplicação CDB Nubank' },
      ],
    },
    {
      nome: 'Viagem de fim de ano',
      descricao: DEMO_PLANNING_TAG,
      valorObjetivo: 2500,
      valorAtual: 400,
      dataInicio: '2026-07-01',
      dataFim: '2026-12-20',
      progressos: [
        { data: '2026-08-05', valor: 200, observacao: 'Parte do PIX recebido' },
        { data: '2026-09-05', valor: 200, observacao: 'Parte do PIX recebido' },
      ],
    },
  ];

  const orcamentos: DemoOrcamentoSeed[] = [
    {
      mes: 7,
      ano: 2026,
      nome: 'Orçamento Julho 2026',
      valorTotal: 1250,
      observacao: DEMO_PLANNING_TAG,
      categorias: [
        { hint: 'APLICACAO CDB NUBANK', limite: 300 },
        { hint: 'PIX ENVIADO', limite: 550 },
        { hint: CREDIT_CARD_CATEGORY_HINT, limite: 400 },
      ],
    },
    {
      mes: 8,
      ano: 2026,
      nome: 'Orçamento Agosto 2026',
      valorTotal: 1400,
      observacao: DEMO_PLANNING_TAG,
      categorias: [
        { hint: 'APLICACAO CDB NUBANK', limite: 300 },
        { hint: 'PIX ENVIADO', limite: 650 },
        { hint: CREDIT_CARD_CATEGORY_HINT, limite: 450 },
      ],
    },
    {
      mes: 9,
      ano: 2026,
      nome: 'Orçamento Setembro 2026',
      valorTotal: 1400,
      observacao: DEMO_PLANNING_TAG,
      categorias: [
        { hint: 'APLICACAO CDB NUBANK', limite: 300 },
        { hint: 'PIX ENVIADO', limite: 400 },
        { hint: CREDIT_CARD_CATEGORY_HINT, limite: 700 },
      ],
    },
  ];

  const investments: DemoInvestmentSeed[] = [
    {
      name: 'CDB Nubank 100% CDI',
      type: 'fixed_income',
      ticker: `${DEMO_INVESTMENT_TICKER_PREFIX}CDB`,
      quantity: 900,
      averagePrice: 1,
      transactions: [
        {
          kind: 'buy',
          quantity: 300,
          unitPrice: 1,
          occurredAt: '2026-07-10T15:00:00.000Z',
          notes: DEMO_PLANNING_TAG,
        },
        {
          kind: 'buy',
          quantity: 300,
          unitPrice: 1,
          occurredAt: '2026-08-10T15:00:00.000Z',
          notes: DEMO_PLANNING_TAG,
        },
        {
          kind: 'buy',
          quantity: 300,
          unitPrice: 1,
          occurredAt: '2026-09-10T15:00:00.000Z',
          notes: DEMO_PLANNING_TAG,
        },
      ],
    },
    {
      name: 'Tesouro Selic 2029',
      type: 'fixed_income',
      ticker: `${DEMO_INVESTMENT_TICKER_PREFIX}SELIC`,
      quantity: 200,
      averagePrice: 1,
      transactions: [
        {
          kind: 'buy',
          quantity: 200,
          unitPrice: 1,
          occurredAt: '2026-08-15T15:00:00.000Z',
          notes: DEMO_PLANNING_TAG,
        },
      ],
    },
  ];

  return { metas, orcamentos, investments };
}
