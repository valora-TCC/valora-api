import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrcamentoCategoriaItemDto {
  @IsUUID()
  idCategoria!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  limite!: number;
}

export class CreateOrcamentoDto {
  @IsInt()
  @Min(1)
  @Max(12)
  mes!: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  ano!: number;

  @IsString()
  @MaxLength(120)
  nome!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorTotal!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacao?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrcamentoCategoriaItemDto)
  @ArrayMinSize(1)
  categorias?: OrcamentoCategoriaItemDto[];
}

export class UpdateOrcamentoDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorTotal?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacao?: string;
}

export class UpsertOrcamentoCategoriaDto {
  @IsUUID()
  idCategoria!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  limite!: number;
}
