import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  CreateOrcamentoDto,
  UpdateOrcamentoDto,
  UpsertOrcamentoCategoriaDto,
} from './dto/orcamento.dto';

@Injectable()
export class OrcamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(userId: string) {
    const orcamentos = await this.prisma.orcamento.findMany({
      where: { idUsuario: userId },
      include: { categorias: { include: { categoria: true } } },
      orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
    });
    return Promise.all(orcamentos.map((item) => this.withStatus(userId, item)));
  }

  async findOne(userId: string, id: string) {
    const orcamento = await this.prisma.orcamento.findFirst({
      where: { id, idUsuario: userId },
      include: { categorias: { include: { categoria: true } } },
    });
    if (!orcamento) {
      throw new NotFoundException('Orcamento not found');
    }
    return this.withStatus(userId, orcamento);
  }

  async create(userId: string, dto: CreateOrcamentoDto) {
    await this.usersService.getOrCreateMe(userId);
    if (dto.categorias?.length) {
      await this.assertCategorias(userId, dto.categorias.map((c) => c.idCategoria));
    }

    const orcamento = await this.prisma.orcamento.create({
      data: {
        idUsuario: userId,
        mes: dto.mes,
        ano: dto.ano,
        nome: dto.nome,
        valorTotal: dto.valorTotal,
        observacao: dto.observacao,
        categorias: dto.categorias
          ? {
              create: dto.categorias.map((item) => ({
                idCategoria: item.idCategoria,
                limite: item.limite,
              })),
            }
          : undefined,
      },
      include: { categorias: { include: { categoria: true } } },
    });
    return this.withStatus(userId, orcamento);
  }

  async update(userId: string, id: string, dto: UpdateOrcamentoDto) {
    await this.findOne(userId, id);
    const orcamento = await this.prisma.orcamento.update({
      where: { id },
      data: {
        nome: dto.nome,
        valorTotal: dto.valorTotal,
        observacao: dto.observacao,
      },
      include: { categorias: { include: { categoria: true } } },
    });
    return this.withStatus(userId, orcamento);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.orcamento.delete({ where: { id } });
    return { deleted: true };
  }

  async upsertCategoria(userId: string, id: string, dto: UpsertOrcamentoCategoriaDto) {
    await this.findOne(userId, id);
    await this.assertCategorias(userId, [dto.idCategoria]);

    const existing = await this.prisma.orcamentoCategoria.findFirst({
      where: { idOrcamento: id, idCategoria: dto.idCategoria },
    });

    if (existing) {
      await this.prisma.orcamentoCategoria.update({
        where: { id: existing.id },
        data: { limite: dto.limite },
      });
    } else {
      await this.prisma.orcamentoCategoria.create({
        data: {
          idOrcamento: id,
          idCategoria: dto.idCategoria,
          limite: dto.limite,
        },
      });
    }

    return this.findOne(userId, id);
  }

  async removeCategoria(userId: string, id: string, idOrcCategoria: string) {
    await this.findOne(userId, id);
    const row = await this.prisma.orcamentoCategoria.findFirst({
      where: { id: idOrcCategoria, idOrcamento: id },
    });
    if (!row) {
      throw new NotFoundException('Orcamento categoria not found');
    }
    await this.prisma.orcamentoCategoria.delete({ where: { id: idOrcCategoria } });
    return this.findOne(userId, id);
  }

  async syncGastosForTransacao(userId: string, idCategoria: string, dataTransacao: Date) {
    const mes = dataTransacao.getUTCMonth() + 1;
    const ano = dataTransacao.getUTCFullYear();
    const orcamentos = await this.prisma.orcamento.findMany({
      where: { idUsuario: userId, mes, ano, ativo: true },
      select: { id: true },
    });
    for (const orcamento of orcamentos) {
      await this.persistValorGasto(userId, orcamento.id, idCategoria, mes, ano);
    }
  }

  private async persistValorGasto(
    userId: string,
    idOrcamento: string,
    idCategoria: string,
    mes: number,
    ano: number,
  ) {
    const gasto = await this.sumDespesas(userId, idCategoria, mes, ano);
    await this.prisma.orcamentoCategoria.updateMany({
      where: { idOrcamento, idCategoria },
      data: { valorGasto: gasto },
    });
  }

  private async sumDespesas(userId: string, idCategoria: string, mes: number, ano: number) {
    const from = new Date(Date.UTC(ano, mes - 1, 1));
    const to = new Date(Date.UTC(ano, mes, 1));
    const agg = await this.prisma.transacao.aggregate({
      _sum: { valor: true },
      where: {
        ativo: true,
        tipo: 'DESPESA',
        idCategoria,
        carteira: { idUsuario: userId },
        dataTransacao: { gte: from, lt: to },
      },
    });
    return agg._sum.valor ?? new Prisma.Decimal(0);
  }

  private async withStatus(
    userId: string,
    orcamento: Prisma.OrcamentoGetPayload<{ include: { categorias: { include: { categoria: true } } } }>,
  ) {
    const categorias = await Promise.all(
      orcamento.categorias.map(async (item) => {
        const valorGasto = await this.sumDespesas(userId, item.idCategoria, orcamento.mes, orcamento.ano);
        await this.prisma.orcamentoCategoria.update({
          where: { id: item.id },
          data: { valorGasto },
        });
        const limite = new Prisma.Decimal(item.limite);
        const percentual = limite.equals(0) ? 0 : Number(valorGasto.div(limite).mul(100).toFixed(2));
        return {
          ...item,
          valorGasto,
          percentual,
          status: valorGasto.greaterThan(limite) ? 'ACIMA' : 'DENTRO',
        };
      }),
    );

    const totalGasto = categorias.reduce(
      (acc, item) => acc.add(item.valorGasto),
      new Prisma.Decimal(0),
    );

    return {
      ...orcamento,
      categorias,
      totalGasto,
      status: totalGasto.greaterThan(orcamento.valorTotal) ? 'ACIMA' : 'DENTRO',
    };
  }

  private async assertCategorias(userId: string, ids: string[]) {
    const count = await this.prisma.categoria.count({
      where: { idUsuario: userId, id: { in: ids } },
    });
    if (count !== ids.length) {
      throw new BadRequestException('Invalid categoria');
    }
  }
}
