import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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
  @IsIn(['simples', 'compostos', 'SELIC', 'CDI', 'manual'])
  tipoTaxa!: string;

  @IsInt()
  @Min(1)
  @Max(600)
  tempoMeses!: number;
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
}
