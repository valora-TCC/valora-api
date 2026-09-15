import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const PRODUTOS_SIMULACAO = [
  'cdb',
  'tesouro',
  'lci_lca',
  'poupanca',
  'simples',
  'compostos',
] as const;

export type ProdutoSimulacao = (typeof PRODUTOS_SIMULACAO)[number];

export class CreateSimulacaoDto {
  @IsString()
  @MaxLength(120)
  nome!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valorInicial!: number;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  taxaJuros!: number;

  @IsString()
  @IsIn(['simples', 'compostos', 'SELIC', 'CDI', 'manual', 'cdb', 'tesouro', 'lci_lca', 'poupanca'])
  tipoTaxa!: string;

  @IsInt()
  @Min(1)
  @Max(600)
  tempoMeses!: number;

  @IsOptional()
  @IsString()
  @IsIn([...PRODUTOS_SIMULACAO])
  produto?: ProdutoSimulacao;
}

export class PreviewSimulacaoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valorInicial!: number;

  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  taxaJuros!: number;

  @IsString()
  @IsIn(['simples', 'compostos'])
  tipoCalculo!: 'simples' | 'compostos';

  @IsInt()
  @Min(1)
  @Max(600)
  tempoMeses!: number;

  @IsOptional()
  @IsString()
  @IsIn(['aa', 'am'])
  periodoTaxa?: 'aa' | 'am';

  @IsOptional()
  @IsString()
  @IsIn([...PRODUTOS_SIMULACAO])
  produto?: ProdutoSimulacao;
}
