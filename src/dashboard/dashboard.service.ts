import { Injectable } from '@nestjs/common';
import { getBrazilYearMonth, parseRangeEnd, parseRangeStart } from '../common/date-range';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, query: DashboardQueryDto) {
    const now = new Date();
    const { year, month } = getBrazilYearMonth(now);
    const from = query.from
      ? parseRangeStart(query.from)
      : parseRangeStart(`${year}-${String(month).padStart(2, '0')}-01`);
    const to = query.to ? parseRangeEnd(query.to) : now;

    const where: Prisma.TransacaoWhereInput = {
      ativo: true,
      carteira: { idUsuario: userId },
      dataTransacao: { gte: from, lte: to },
    };

    const [byType, byCategory, recent, carteiras] = await Promise.all([
      this.prisma.transacao.groupBy({
        by: ['tipo'],
        where,
        _sum: { valor: true },
      }),
      this.prisma.transacao.groupBy({
        by: ['idCategoria'],
        where: { ...where, tipo: 'DESPESA' },
        _sum: { valor: true },
      }),
      this.prisma.transacao.findMany({
        where,
        include: { carteira: true, categoria: true },
        orderBy: { dataTransacao: 'desc' },
        take: 8,
      }),
      this.prisma.carteira.findMany({ where: { idUsuario: userId, ativo: true } }),
    ]);

    const income = byType.find((r) => r.tipo === 'RECEITA')?._sum.valor ?? new Prisma.Decimal(0);
    const expense = byType.find((r) => r.tipo === 'DESPESA')?._sum.valor ?? new Prisma.Decimal(0);

    const categoryIds = byCategory.map((c) => c.idCategoria);
    const categorias = categoryIds.length
      ? await this.prisma.categoria.findMany({
          where: { id: { in: categoryIds }, idUsuario: userId },
        })
      : [];

    const expensesByCategory = byCategory.map((row) => {
      const categoria = categorias.find((c) => c.id === row.idCategoria);
      return {
        categoryId: row.idCategoria,
        categoryName: categoria?.nome ?? 'Sem categoria',
        color: categoria?.cor ?? null,
        amount: row._sum.valor ?? new Prisma.Decimal(0),
      };
    });

    const totalBalance = carteiras.reduce(
      (acc, carteira) => acc.add(carteira.saldoAtual),
      new Prisma.Decimal(0),
    );

    return {
      period: { from, to },
      totals: {
        income,
        expense,
        net: totalBalance.add(income).sub(expense),
        balance: totalBalance,
      },
      expensesByCategory,
      recentTransactions: recent,
    };
  }
}
