import { Injectable } from '@nestjs/common';
import { parseDateOnly, toDateOnlyIso } from '../common/date-range';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateMe(userId: string, email?: string) {
    const existing = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (existing) {
      if (email && !existing.email) {
        return this.serializeUser(
          await this.prisma.usuario.update({
            where: { id: userId },
            data: { email },
          }),
        );
      }
      return this.serializeUser(existing);
    }

    return this.serializeUser(
      await this.prisma.usuario.create({
        data: {
          id: userId,
          nome: email?.split('@')[0] ?? 'Usuario',
          email: email ?? null,
        },
      }),
    );
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    await this.getOrCreateMe(userId);
    return this.serializeUser(
      await this.prisma.usuario.update({
        where: { id: userId },
        data: {
          nome: dto.nome,
          dataNascimento: dto.dataNascimento ? parseDateOnly(dto.dataNascimento) : undefined,
        },
      }),
    );
  }

  private serializeUser<T extends { dataNascimento: Date | null }>(user: T) {
    return {
      ...user,
      dataNascimento: user.dataNascimento ? toDateOnlyIso(user.dataNascimento) : null,
    };
  }
}
