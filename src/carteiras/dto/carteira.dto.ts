import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCarteiraDto {
  @IsString()
  @MaxLength(80)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  saldoAtual?: number;
}

export class UpdateCarteiraDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
