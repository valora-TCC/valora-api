import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarteiraDto, UpdateCarteiraDto } from './dto/carteira.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class CarteirasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  findAll(userId: string) {
    return this.prisma.carteira.findMany({
      where: { idUsuario: userId },
      orderBy: { dataCriacao: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const carteira = await this.prisma.carteira.findFirst({
      where: { id, idUsuario: userId },
    });
    if (!carteira) {
      throw new NotFoundException('Carteira not found');
    }
    return carteira;
  }

  async create(userId: string, dto: CreateCarteiraDto) {
    await this.usersService.getOrCreateMe(userId);
    return this.prisma.carteira.create({
      data: {
        idUsuario: userId,
        nome: dto.nome,
        descricao: dto.descricao,
        saldoAtual: dto.saldoAtual ?? 0,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCarteiraDto) {
    await this.findOne(userId, id);
    return this.prisma.carteira.update({
      where: { id },
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        ativo: dto.ativo,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.carteira.delete({ where: { id } });
    return { deleted: true };
  }
}
