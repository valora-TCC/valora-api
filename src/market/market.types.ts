export type MarketMoedaDto = {
  codigo: string;
  nome: string;
  simbolo: string;
  taxaParaReal: number;
  pctChange: number | null;
  high: number | null;
  low: number | null;
  dataAtualizacao: string;
};

export type MarketTaxaDto = {
  nome: string;
  valorPercentual: number;
  fonte: string | null;
  dataAtualizacao: string;
  referencia: boolean;
<<<<<<< HEAD
  periodo: 'aa' | 'mensal';
=======
>>>>>>> be3042f (Add fast-xml-parser and chokidar dependencies in package.json and pnpm-lock.yaml; include MarketModule in app.module.ts)
};

export type MarketNoticiaDto = {
  titulo: string;
  url: string;
  fonte: string;
  dataPublicacao: string | null;
  resumo: string | null;
};

export type MarketSummaryDto = {
<<<<<<< HEAD
  cambio: { moedas: MarketMoedaDto[] };
  cripto: { moedas: MarketMoedaDto[] };
  taxas: { taxas: MarketTaxaDto[] };
=======
  moedas: MarketMoedaDto[];
  taxas: MarketTaxaDto[];
>>>>>>> be3042f (Add fast-xml-parser and chokidar dependencies in package.json and pnpm-lock.yaml; include MarketModule in app.module.ts)
  noticias: MarketNoticiaDto[];
  atualizadoEm: string;
};

export type AwesomeQuote = {
  code: string;
  name: string;
  bid: string;
  pctChange?: string;
  high?: string;
  low?: string;
};

export type BcbSerieItem = {
  data: string;
  valor: string;
};
<<<<<<< HEAD

export type CoinGeckoPriceMap = Record<string, { brl: number; brl_24h_change?: number }>;
=======
>>>>>>> be3042f (Add fast-xml-parser and chokidar dependencies in package.json and pnpm-lock.yaml; include MarketModule in app.module.ts)
