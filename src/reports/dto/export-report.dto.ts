import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional } from 'class-validator';

export const REPORT_TYPES = ['metas', 'orcamentos', 'carteiras', 'dashboard'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_FORMATS = ['pdf', 'xlsx'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

function parseTypes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(','))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export class ExportReportDto {
  @Transform(({ value }) => parseTypes(value))
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(REPORT_TYPES, { each: true })
  types!: ReportType[];

  @IsIn(REPORT_FORMATS)
  format!: ReportFormat;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
