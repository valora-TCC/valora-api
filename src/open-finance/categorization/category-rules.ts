export type CategoryRule = {
  keywords: string[];
  categoryName: string;
  tipo: 'RECEITA' | 'DESPESA';
};

/** Simple keyword rules — no AI. Extensible via this list. */
export const CATEGORY_RULES: CategoryRule[] = [
  {
    keywords: [
      'IFOOD',
      'IFOOD*',
      'RAPPI',
      'UBER EATS',
      'RESTAURANTE',
      'PADARIA',
      'MERCADO',
      'SUPERMERCADO',
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
    keywords: ['PIX ENVIADO', 'TED ENVIADO', 'TRANSFERENCIA'],
    categoryName: 'Transferências',
    tipo: 'DESPESA',
  },
];

export const FALLBACK_CATEGORY = {
  RECEITA: 'Outros (receita)',
  DESPESA: 'Outros',
} as const;

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
