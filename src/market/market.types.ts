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
};

export type MarketNoticiaDto = {
  titulo: string;
  url: string;
  fonte: string;
  dataPublicacao: string | null;
  resumo: string | null;
};

export type MarketSummaryDto = {
  moedas: MarketMoedaDto[];
  taxas: MarketTaxaDto[];
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
