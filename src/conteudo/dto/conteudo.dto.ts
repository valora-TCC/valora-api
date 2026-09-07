import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateProgressoConteudoDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  progresso?: number;

  @IsOptional()
  @IsBoolean()
  concluido?: boolean;
}
