import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoFinanceiro } from '@prisma/client';

export class CreateCategoriaDto {
  @IsString()
  @MaxLength(80)
  nome!: string;

  @IsEnum(TipoFinanceiro)
  tipo!: TipoFinanceiro;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  cor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  icone?: string;
}

export class UpdateCategoriaDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nome?: string;

  @IsOptional()
  @IsEnum(TipoFinanceiro)
  tipo?: TipoFinanceiro;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  cor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  icone?: string;
}
