import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateMetaDto, CreateProgressoMetaDto, UpdateMetaDto } from './dto/meta.dto';

@Injectable()
export class MetasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(userId: string) {
    const metas = await this.prisma.meta.findMany({
      where: { idUsuario: userId },
      include: { progressos: { orderBy: { data: 'desc' }, take: 5 } },
      orderBy: { dataFim: 'asc' },
    });
    return metas.map((meta) => this.withStatus(meta));
  }

  async findOne(userId: string, id: string) {
    const meta = await this.prisma.meta.findFirst({
      where: { id, idUsuario: userId },
      include: { progressos: { orderBy: { data: 'desc' } } },
    });
    if (!meta) {
      throw new NotFoundException('Meta not found');
    }
    return this.withStatus(meta);
  }

  async create(userId: string, dto: CreateMetaDto) {
    await this.usersService.getOrCreateMe(userId);
    this.assertPeriodo(dto.dataInicio, dto.dataFim);
    const meta = await this.prisma.meta.create({
      data: {
        idUsuario: userId,
        nome: dto.nome,
        descricao: dto.descricao,
        valorObjetivo: dto.valorObjetivo,
        dataInicio: new Date(dto.dataInicio),
        dataFim: new Date(dto.dataFim),
      },
      include: { progressos: true },
    });
    return this.withStatus(meta);
  }

  async update(userId: string, id: string, dto: UpdateMetaDto) {
    const atual = await this.findOne(userId, id);
    const dataInicio = dto.dataInicio ?? atual.dataInicio.toISOString();
    const dataFim = dto.dataFim ?? atual.dataFim.toISOString();
    this.assertPeriodo(dataInicio, dataFim);
    const meta = await this.prisma.meta.update({
      where: { id },
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        valorObjetivo: dto.valorObjetivo,
        dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : undefined,
        dataFim: dto.dataFim ? new Date(dto.dataFim) : undefined,
      },
      include: { progressos: { orderBy: { data: 'desc' } } },
    });
    return this.withStatus(meta);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.meta.delete({ where: { id } });
    return { deleted: true };
  }

  async registrarProgresso(userId: string, id: string, dto: CreateProgressoMetaDto) {
    const meta = await this.findOne(userId, id);
    const valor = new Prisma.Decimal(dto.valor);
    const [progresso] = await this.prisma.$transaction([
      this.prisma.progressoMeta.create({
        data: {
          idMeta: id,
          valor,
          data: dto.data ? new Date(dto.data) : new Date(),
          observacao: dto.observacao,
        },
      }),
      this.prisma.meta.update({
        where: { id },
        data: { valorAtual: new Prisma.Decimal(meta.valorAtual).add(valor) },
      }),
    ]);
    return progresso;
  }

  private assertPeriodo(dataInicio: string, dataFim: string) {
    if (new Date(dataFim) < new Date(dataInicio)) {
      throw new BadRequestException('dataFim must be on or after dataInicio');
    }
  }

  private withStatus<T extends { valorAtual: Prisma.Decimal; valorObjetivo: Prisma.Decimal }>(
    meta: T,
  ) {
    const atual = new Prisma.Decimal(meta.valorAtual);
    const objetivo = new Prisma.Decimal(meta.valorObjetivo);
    const percentual = objetivo.equals(0) ? 0 : Number(atual.div(objetivo).mul(100).toFixed(2));
    return { ...meta, percentual };
  }
}
