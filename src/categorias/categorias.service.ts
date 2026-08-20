import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  findAll(userId: string) {
    return this.prisma.categoria.findMany({
      where: { idUsuario: userId },
      orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
    });
  }

  async findOne(userId: string, id: string) {
    const categoria = await this.prisma.categoria.findFirst({
      where: { id, idUsuario: userId },
    });
    if (!categoria) {
      throw new NotFoundException('Categoria not found');
    }
    return categoria;
  }

  async create(userId: string, dto: CreateCategoriaDto) {
    await this.usersService.getOrCreateMe(userId);
    return this.prisma.categoria.create({
      data: {
        idUsuario: userId,
        nome: dto.nome,
        tipo: dto.tipo,
        cor: dto.cor,
        icone: dto.icone,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoriaDto) {
    await this.findOne(userId, id);
    return this.prisma.categoria.update({
      where: { id },
      data: {
        nome: dto.nome,
        tipo: dto.tipo,
        cor: dto.cor,
        icone: dto.icone,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.categoria.delete({ where: { id } });
    return { deleted: true };
  }
}
