import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  findAll(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, userId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async create(userId: string, dto: CreateCategoryDto) {
    await this.usersService.getOrCreateMe(userId);
    return this.prisma.category.create({
      data: {
        userId,
        name: dto.name,
        kind: dto.kind,
        color: dto.color,
        icon: dto.icon,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(userId, id);
    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        kind: dto.kind,
        color: dto.color,
        icon: dto.icon,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.category.delete({ where: { id } });
    return { deleted: true };
  }
}
