export type CategoryRule = {
  keywords: string[];
  categoryName: string;
  tipo: 'RECEITA' | 'DESPESA';
};

/** Simple keyword rules — no AI. Extensible via this list. */
export const CATEGORY_RULES: CategoryRule[] = [
  {
    keywords: ['CARTAO DE CREDITO', 'CARTÃO DE CRÉDITO', 'CARTAO CREDITO', 'FATURA CARTAO'],
    categoryName: 'Cartão de Crédito',
    tipo: 'DESPESA',
  },
  {
    keywords: ['NETSHOES', 'MERCADO LIVRE', 'MERCADOLIVRE', 'AMAZON', 'SHEIN', 'MAGALU'],
    categoryName: 'Compras',
    tipo: 'DESPESA',
  },
  {
    keywords: [
      'IFOOD',
      'IFOOD*',
      'RAPPI',
      'UBER EATS',
      '99 FOOD',
      '99FOOD',
      'RESTAURANTE',
      'PADARIA',
      'SUPERMERCADO',
      'MERCADO EXTRA',
    ],
    categoryName: 'Alimentação',
    tipo: 'DESPESA',
  },
  {
    keywords: [
      'UBER',
      '99APP',
      '99 POP',
      'CABIFY',
      'METRO',
      'ONIBUS',
      'COMBUSTIVEL',
      'POSTO',
      'SHELL',
      'IPIRANGA',
    ],
    categoryName: 'Transporte',
    tipo: 'DESPESA',
  },
  {
    keywords: ['NETFLIX', 'SPOTIFY', 'DISNEY', 'PRIME VIDEO', 'HBO', 'YOUTUBE', 'CINEMA', 'STEAM'],
    categoryName: 'Lazer',
    tipo: 'DESPESA',
  },
  {
    keywords: ['FARMACIA', 'DROGARIA', 'HOSPITAL', 'CLINICA', 'PLANO DE SAUDE'],
    categoryName: 'Saúde',
    tipo: 'DESPESA',
  },
  {
    keywords: [
      'ALUGUEL',
      'CONDOMINIO',
      'ENERGIA',
      'CEMIG',
      'ENEL',
      'SABESP',
      'AGUA',
      'INTERNET',
      'VIVO',
      'CLARO',
      'TIM',
    ],
    categoryName: 'Moradia',
    tipo: 'DESPESA',
  },
  {
    keywords: [
      'SALARIO',
      'SALÁRIO',
      'FOLHA',
      'PROVENTOS',
      'PIX RECEBIDO',
      'TED RECEBIDO',
      'RENDIMENTO',
    ],
    categoryName: 'Receita',
    tipo: 'RECEITA',
  },
  {
    keywords: ['PIX ENVIADO', 'TED ENVIADO', 'TRANSFERENCIA', 'PAGAMENTO FATURA'],
    categoryName: 'Transferências',
    tipo: 'DESPESA',
  },
  {
    keywords: ['APLICACAO', 'APLICAÇÃO', 'CDB', 'INVEST'],
    categoryName: 'Investimentos',
    tipo: 'DESPESA',
  },
];


export const FALLBACK_CATEGORY = {
  RECEITA: 'Outros (receita)',
  DESPESA: 'Outros',
} as const;

/** Distinct palette per category (shown in categorias / dashboard). */
export const CATEGORY_COLORS: Record<string, string> = {
  Receita: '#16a34a',
  'Outros (receita)': '#22c55e',
  Alimentação: '#f97316',
  Transporte: '#0ea5e9',
  Lazer: '#a855f7',
  Saúde: '#ef4444',
  Moradia: '#78716c',
  Transferências: '#6366f1',
  Investimentos: '#eab308',
  'Cartão de Crédito': '#ec4899',
  Compras: '#14b8a6',
  Outros: '#64748b',
};

export function colorForCategory(nome: string, tipo: 'RECEITA' | 'DESPESA'): string {
  return CATEGORY_COLORS[nome] ?? (tipo === 'RECEITA' ? '#16a34a' : '#64748b');
}

/** Names the user may already have created that should be reused by Open Finance. */
export const CATEGORY_ALIASES: Record<string, string[]> = {
  Receita: ['Salário', 'Renda', 'Entrada'],
  'Outros (receita)': ['Outros', 'Outras receitas'],
  Outros: ['Outras', 'Diversos', 'Outros gastos'],
  Transferências: ['Transferencia', 'Pix'],
  Investimentos: ['Investimento', 'Aplicações', 'Aplicacoes'],
  'Cartão de Crédito': ['Cartao de Credito', 'Cartão', 'Fatura'],
};

export function matchCategoryRule(
  description: string,
  tipo: 'RECEITA' | 'DESPESA',
): CategoryRule | null {
  const normalized = description.toUpperCase().normalize('NFD').replace(/\p{M}/gu, '');
  for (const rule of CATEGORY_RULES) {
    if (rule.tipo !== tipo) continue;
    if (
      rule.keywords.some((kw) =>
        normalized.includes(kw.toUpperCase().normalize('NFD').replace(/\p{M}/gu, '')),
      )
    ) {
      return rule;
    }
  }
  return null;
}
