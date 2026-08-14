import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  CreateTransactionDto,
  ListTransactionsQueryDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(userId: string, query: ListTransactionsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: {
          account: true,
          category: true,
        },
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      include: { account: true, category: true },
    });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    return tx;
  }

  async create(userId: string, dto: CreateTransactionDto) {
    await this.usersService.getOrCreateMe(userId);
    await this.assertAccountOwnership(userId, dto.accountId);
    if (dto.categoryId) {
      await this.assertCategoryOwnership(userId, dto.categoryId);
    }

    return this.prisma.transaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        type: dto.type,
        amount: dto.amount,
        occurredAt: new Date(dto.occurredAt),
        description: dto.description,
        notes: dto.notes,
      },
      include: { account: true, category: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    await this.findOne(userId, id);
    if (dto.accountId) {
      await this.assertAccountOwnership(userId, dto.accountId);
    }
    if (dto.categoryId) {
      await this.assertCategoryOwnership(userId, dto.categoryId);
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        accountId: dto.accountId,
        categoryId: dto.categoryId === undefined ? undefined : dto.categoryId,
        type: dto.type,
        amount: dto.amount,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        description: dto.description,
        notes: dto.notes,
      },
      include: { account: true, category: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  private async assertAccountOwnership(userId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) {
      throw new BadRequestException('Invalid account');
    }
  }

  private async assertCategoryOwnership(userId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) {
      throw new BadRequestException('Invalid category');
    }
  }
}
