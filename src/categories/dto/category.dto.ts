import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CategoryKind } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsEnum(CategoryKind)
  kind!: CategoryKind;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsEnum(CategoryKind)
  kind?: CategoryKind;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;
}
