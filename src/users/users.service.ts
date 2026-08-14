import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateMe(userId: string, email?: string) {
    const existing = await this.prisma.profile.findUnique({ where: { id: userId } });
    if (existing) {
      return existing;
    }

    return this.prisma.profile.create({
      data: {
        id: userId,
        fullName: email?.split('@')[0] ?? null,
      },
    });
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    await this.getOrCreateMe(userId);
    return this.prisma.profile.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        avatarUrl: dto.avatarUrl,
      },
    });
  }
}
