import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoFinanceiro } from '../../prisma/client';
import { Type } from 'class-transformer';

export class CreateTransacaoDto {
  @IsUUID()
  idCarteira!: string;

  @IsUUID()
  idCategoria!: string;

  @IsOptional()
  @IsEnum(TipoFinanceiro)
  tipo?: TipoFinanceiro;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor!: number;

  @IsDateString()
  dataTransacao!: string;

  @IsString()
  @MaxLength(200)
  descricao!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  formaPagamento?: string;
}

export class UpdateTransacaoDto {
  @IsOptional()
  @IsUUID()
  idCarteira?: string;

  @IsOptional()
  @IsUUID()
  idCategoria?: string;

  @IsOptional()
  @IsEnum(TipoFinanceiro)
  tipo?: TipoFinanceiro;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor?: number;

  @IsOptional()
  @IsDateString()
  dataTransacao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descricao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  formaPagamento?: string;
}

export class ListTransacoesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  idCarteira?: string;

  @IsOptional()
  @IsUUID()
  idCategoria?: string;

  @IsOptional()
  @IsEnum(TipoFinanceiro)
  tipo?: TipoFinanceiro;
}
