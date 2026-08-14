import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, query: DashboardQueryDto) {
    const now = new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const to = query.to ? new Date(query.to) : now;

    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
      occurredAt: { gte: from, lte: to },
    };

    const [byType, byCategory, recent, accounts] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { ...where, type: 'expense' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.findMany({
        where,
        include: { account: true, category: true },
        orderBy: { occurredAt: 'desc' },
        take: 8,
      }),
      this.prisma.account.findMany({ where: { userId, isArchived: false } }),
    ]);

    const income = byType.find((r) => r.type === 'income')?._sum.amount ?? new Prisma.Decimal(0);
    const expense = byType.find((r) => r.type === 'expense')?._sum.amount ?? new Prisma.Decimal(0);

    const categoryIds = byCategory.map((c) => c.categoryId).filter(Boolean) as string[];
    const categories = categoryIds.length
      ? await this.prisma.category.findMany({ where: { id: { in: categoryIds }, userId } })
      : [];

    const expensesByCategory = byCategory.map((row) => {
      const category = categories.find((c) => c.id === row.categoryId);
      return {
        categoryId: row.categoryId,
        categoryName: category?.name ?? 'Sem categoria',
        amount: row._sum.amount ?? new Prisma.Decimal(0),
      };
    });

    let totalBalance = new Prisma.Decimal(0);
    for (const account of accounts) {
      const aggregates = await this.prisma.transaction.groupBy({
        by: ['type'],
        where: { accountId: account.id, deletedAt: null },
        _sum: { amount: true },
      });
      let balance = new Prisma.Decimal(account.initialBalance);
      for (const row of aggregates) {
        const sum = row._sum.amount ?? new Prisma.Decimal(0);
        if (row.type === 'income') balance = balance.add(sum);
        if (row.type === 'expense') balance = balance.sub(sum);
      }
      totalBalance = totalBalance.add(balance);
    }

    return {
      period: { from, to },
      totals: {
        income,
        expense,
        net: new Prisma.Decimal(income).sub(expense),
        balance: totalBalance,
      },
      expensesByCategory,
      recentTransactions: recent,
    };
  }
}
