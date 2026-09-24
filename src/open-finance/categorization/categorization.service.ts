import { Injectable } from '@nestjs/common';
import { Prisma } from '../../prisma/client';
import type { TipoFinanceiro } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ledgerNamesMatch } from '../ledger-identity';
import {
  CATEGORY_ALIASES,
  colorForCategory,
  FALLBACK_CATEGORY,
  matchCategoryRule,
} from './category-rules';

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
    const cor = colorForCategory(nome, tipo);
    const existing = await this.findReusableCategory(userId, nome, tipo);
    if (existing) {
      const needsActivate = !existing.ativo;
      const needsColor = existing.cor !== cor;
      if (needsActivate || needsColor) {
        await this.prisma.categoria.update({
          where: { id: existing.id },
          data: {
            ...(needsActivate ? { ativo: true } : {}),
            ...(needsColor ? { cor } : {}),
          },
        });
      }
      return existing.id;
    }

    try {
      const created = await this.prisma.categoria.create({
        data: {
          idUsuario: userId,
          nome,
          tipo,
          cor,
        },
      });
      return created.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const conflict = await this.findReusableCategory(userId, nome, tipo);
        if (conflict) return conflict.id;
      }
      throw error;
    }
  }

  private async findReusableCategory(userId: string, nome: string, tipo: TipoFinanceiro) {
    const categories = await this.prisma.categoria.findMany({
      where: { idUsuario: userId, tipo },
    });
    const aliases = [nome, ...(CATEGORY_ALIASES[nome] ?? [])];
    const canonical = categories.find((c) => ledgerNamesMatch(c.nome, nome));
    if (canonical) return canonical;
    return categories.find((c) => aliases.some((alias) => ledgerNamesMatch(c.nome, alias))) ?? null;
  }
}
