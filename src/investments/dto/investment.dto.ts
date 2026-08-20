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
import { InvestmentType } from '@prisma/client';

export class CreateInvestmentDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEnum(InvestmentType)
  type!: InvestmentType;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  ticker?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

export class UpdateInvestmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(InvestmentType)
  type?: InvestmentType;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  ticker?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

export class CreateInvestmentTransactionDto {
  @IsUUID()
  investmentId!: string;

  @IsString()
  @MaxLength(32)
  kind!: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0.00000001)
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
