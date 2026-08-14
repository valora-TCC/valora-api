import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  CreateInvestmentDto,
  CreateInvestmentTransactionDto,
  UpdateInvestmentDto,
} from './dto/investment.dto';

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  findAll(userId: string) {
    return this.prisma.investment.findMany({
      where: { userId },
      include: { transactions: { orderBy: { occurredAt: 'desc' }, take: 5 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const investment = await this.prisma.investment.findFirst({
      where: { id, userId },
      include: { transactions: { orderBy: { occurredAt: 'desc' } } },
    });
    if (!investment) {
      throw new NotFoundException('Investment not found');
    }
    return investment;
  }

  async create(userId: string, dto: CreateInvestmentDto) {
    await this.usersService.getOrCreateMe(userId);
    return this.prisma.investment.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        ticker: dto.ticker,
        currency: dto.currency ?? 'BRL',
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateInvestmentDto) {
    await this.findOne(userId, id);
    return this.prisma.investment.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        ticker: dto.ticker,
        currency: dto.currency,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.investment.delete({ where: { id } });
    return { deleted: true };
  }

  async addTransaction(userId: string, dto: CreateInvestmentTransactionDto) {
    const investment = await this.findOne(userId, dto.investmentId);
    const quantity = new Prisma.Decimal(dto.quantity);
    const unitPrice = new Prisma.Decimal(dto.unitPrice);

    const kind = dto.kind.toLowerCase();
    if (!['buy', 'sell', 'dividend'].includes(kind)) {
      throw new BadRequestException('kind must be buy, sell or dividend');
    }

    let nextQuantity = new Prisma.Decimal(investment.quantity);
    let nextAverage = new Prisma.Decimal(investment.averagePrice);

    if (kind === 'buy') {
      const currentCost = nextQuantity.mul(nextAverage);
      const addedCost = quantity.mul(unitPrice);
      nextQuantity = nextQuantity.add(quantity);
      nextAverage = nextQuantity.equals(0)
        ? new Prisma.Decimal(0)
        : currentCost.add(addedCost).div(nextQuantity);
    } else if (kind === 'sell') {
      if (quantity.greaterThan(nextQuantity)) {
        throw new BadRequestException('Insufficient quantity');
      }
      nextQuantity = nextQuantity.sub(quantity);
      if (nextQuantity.equals(0)) {
        nextAverage = new Prisma.Decimal(0);
      }
    }

    const [transaction] = await this.prisma.$transaction([
      this.prisma.investmentTransaction.create({
        data: {
          userId,
          investmentId: dto.investmentId,
          kind,
          quantity,
          unitPrice,
          occurredAt: new Date(dto.occurredAt),
          notes: dto.notes,
        },
      }),
      this.prisma.investment.update({
        where: { id: dto.investmentId },
        data: {
          quantity: nextQuantity,
          averagePrice: nextAverage,
        },
      }),
    ]);

    return transaction;
  }
}
