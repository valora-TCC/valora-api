import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { OrcamentosService } from '../orcamentos/orcamentos.service';
import {
  CreateTransacaoDto,
  ListTransacoesQueryDto,
  UpdateTransacaoDto,
} from './dto/transacao.dto';

@Injectable()
export class TransacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly orcamentosService: OrcamentosService,
  ) {}

  async findAll(userId: string, query: ListTransacoesQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: Prisma.TransacaoWhereInput = {
      ativo: true,
      carteira: { idUsuario: userId },
      ...(query.idCarteira ? { idCarteira: query.idCarteira } : {}),
      ...(query.idCategoria ? { idCategoria: query.idCategoria } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.from || query.to
        ? {
            dataTransacao: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transacao.findMany({
        where,
        include: {
          carteira: true,
          categoria: true,
        },
        orderBy: { dataTransacao: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transacao.count({ where }),
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
    const tx = await this.prisma.transacao.findFirst({
      where: { id, ativo: true, carteira: { idUsuario: userId } },
      include: { carteira: true, categoria: true },
    });
    if (!tx) {
      throw new NotFoundException('Transacao not found');
    }
    return tx;
  }

  async create(userId: string, dto: CreateTransacaoDto) {
    await this.usersService.getOrCreateMe(userId);
    await this.assertCarteiraOwnership(userId, dto.idCarteira);
    await this.assertCategoriaOwnership(userId, dto.idCategoria);

    const created = await this.prisma.transacao.create({
      data: {
        idCarteira: dto.idCarteira,
        idCategoria: dto.idCategoria,
        tipo: dto.tipo,
        valor: dto.valor,
        dataTransacao: new Date(dto.dataTransacao),
        descricao: dto.descricao,
        formaPagamento: dto.formaPagamento,
      },
      include: { carteira: true, categoria: true },
    });
    await this.syncOrcamento(userId, created.idCategoria, created.dataTransacao);
    return created;
  }

  async update(userId: string, id: string, dto: UpdateTransacaoDto) {
    const previous = await this.findOne(userId, id);
    if (dto.idCarteira) {
      await this.assertCarteiraOwnership(userId, dto.idCarteira);
    }
    if (dto.idCategoria) {
      await this.assertCategoriaOwnership(userId, dto.idCategoria);
    }

    const updated = await this.prisma.transacao.update({
      where: { id },
      data: {
        idCarteira: dto.idCarteira,
        idCategoria: dto.idCategoria,
        tipo: dto.tipo,
        valor: dto.valor,
        dataTransacao: dto.dataTransacao ? new Date(dto.dataTransacao) : undefined,
        descricao: dto.descricao,
        formaPagamento: dto.formaPagamento,
      },
      include: { carteira: true, categoria: true },
    });
    await this.syncOrcamento(userId, previous.idCategoria, previous.dataTransacao);
    await this.syncOrcamento(userId, updated.idCategoria, updated.dataTransacao);
    return updated;
  }

  async remove(userId: string, id: string) {
    const existing = await this.findOne(userId, id);
    await this.prisma.transacao.update({
      where: { id },
      data: { ativo: false },
    });
    await this.syncOrcamento(userId, existing.idCategoria, existing.dataTransacao);
    return { deleted: true };
  }

  private async syncOrcamento(userId: string, idCategoria: string, dataTransacao: Date) {
    await this.orcamentosService.syncGastosForTransacao(userId, idCategoria, dataTransacao);
  }

  private async assertCarteiraOwnership(userId: string, idCarteira: string) {
    const carteira = await this.prisma.carteira.findFirst({
      where: { id: idCarteira, idUsuario: userId },
    });
    if (!carteira) {
      throw new BadRequestException('Invalid carteira');
    }
  }

  private async assertCategoriaOwnership(userId: string, idCategoria: string) {
    const categoria = await this.prisma.categoria.findFirst({
      where: { id: idCategoria, idUsuario: userId },
    });
    if (!categoria) {
      throw new BadRequestException('Invalid categoria');
    }
  }
}
