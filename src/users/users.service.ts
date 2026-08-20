import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateMe(userId: string, email?: string) {
    const existing = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (existing) {
      if (email && !existing.email) {
        return this.prisma.usuario.update({
          where: { id: userId },
          data: { email },
        });
      }
      return existing;
    }

    return this.prisma.usuario.create({
      data: {
        id: userId,
        nome: email?.split('@')[0] ?? 'Usuario',
        email: email ?? null,
      },
    });
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    await this.getOrCreateMe(userId);
    return this.prisma.usuario.update({
      where: { id: userId },
      data: {
        nome: dto.nome,
        dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
      },
    });
  }
}
