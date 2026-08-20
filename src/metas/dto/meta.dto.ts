import { IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMetaDto {
  @IsString()
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valorObjetivo!: number;

  @IsDateString()
  dataInicio!: string;

  @IsDateString()
  dataFim!: string;
}

export class UpdateMetaDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valorObjetivo?: number;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;
}

export class CreateProgressoMetaDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor!: number;

  @IsOptional()
  @IsDateString()
  data?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string;
}
