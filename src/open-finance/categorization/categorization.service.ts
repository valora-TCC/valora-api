import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { TipoFinanceiro } from '../../prisma/client';
import { FALLBACK_CATEGORY, matchCategoryRule } from './category-rules';

@Injectable()
export class CategorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveCategoryId(
    userId: string,
    description: string,
    tipo: TipoFinanceiro,
  ): Promise<string> {
    const rule = matchCategoryRule(description, tipo);
    const name = rule?.categoryName ?? FALLBACK_CATEGORY[tipo];
    return this.ensureCategory(userId, name, tipo);
  }

  private async ensureCategory(
    userId: string,
    nome: string,
    tipo: TipoFinanceiro,
  ): Promise<string> {
    const existing = await this.prisma.categoria.findFirst({
      where: { idUsuario: userId, nome, tipo, ativo: true },
    });
    if (existing) return existing.id;

    const created = await this.prisma.categoria.create({
      data: {
        idUsuario: userId,
        nome,
        tipo,
        cor: tipo === 'RECEITA' ? '#16a34a' : '#64748b',
      },
    });
    return created.id;
  }
}
