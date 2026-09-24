import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class WidgetTokenDto {
  @ApiProperty({ description: 'CPF com 11 dígitos (somente números)' })
  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter exatamente 11 dígitos numéricos' })
  cpf!: string;

  @ApiPropertyOptional({
    description: 'Nome completo para o consentimento OFDA (default: nome do perfil)',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;
}

export class CreateConnectionDto {
  @ApiProperty({ description: 'Belvo Link ID retornado no callback de sucesso do widget' })
  @IsString()
  @IsUUID()
  belvoLinkId!: string;

  @ApiProperty({ example: 'Nubank', description: 'Nome da instituição (exibido no app)' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  institution!: string;
}

export class DemoConnectDto {
  @ApiProperty({ description: 'CPF com 11 dígitos (somente números)' })
  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter exatamente 11 dígitos numéricos' })
  cpf!: string;

  @ApiProperty({ description: 'Nome completo do titular' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;
}
