import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const withBalances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await this.computeBalance(account.id, account.initialBalance);
        return { ...account, balance };
      }),
    );

    return withBalances;
  }

  async findOne(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({ where: { id, userId } });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    const balance = await this.computeBalance(account.id, account.initialBalance);
    return { ...account, balance };
  }

  async create(userId: string, dto: CreateAccountDto) {
    await this.usersService.getOrCreateMe(userId);
    return this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        currency: dto.currency ?? 'BRL',
        initialBalance: dto.initialBalance ?? 0,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    await this.findOne(userId, id);
    return this.prisma.account.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        currency: dto.currency,
        initialBalance: dto.initialBalance,
        isArchived: dto.isArchived,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.account.delete({ where: { id } });
    return { deleted: true };
  }

  private async computeBalance(accountId: string, initialBalance: Prisma.Decimal) {
    const aggregates = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { accountId, deletedAt: null },
      _sum: { amount: true },
    });

    let balance = new Prisma.Decimal(initialBalance);
    for (const row of aggregates) {
      const sum = row._sum.amount ?? new Prisma.Decimal(0);
      if (row.type === 'income') {
        balance = balance.add(sum);
      } else if (row.type === 'expense') {
        balance = balance.sub(sum);
      }
    }
    return balance;
  }
}
