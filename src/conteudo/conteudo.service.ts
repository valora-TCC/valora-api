import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { Conteudo, UsuarioConteudo } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CONTEUDO_SEED } from './conteudo.seed';
import type { UpdateProgressoConteudoDto } from './dto/conteudo.dto';

@Injectable()
export class ConteudoService implements OnModuleInit {
  private readonly logger = new Logger(ConteudoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureSeed();
    } catch (error) {
      this.logger.warn(`Conteudo seed skipped: ${String(error)}`);
    }
  }

  async ensureSeed(): Promise<void> {
    for (const item of CONTEUDO_SEED) {
      await this.prisma.conteudo.upsert({
        where: { slug: item.slug },
        create: {
          slug: item.slug,
          titulo: item.titulo,
          descricao: item.descricao,
          corpo: item.corpo,
          nivel: item.nivel,
          tipo: item.tipo,
          ordem: item.ordem,
          url: item.url ?? null,
          dataPublicacao: new Date(),
          ativo: true,
        },
        update: {
          titulo: item.titulo,
          descricao: item.descricao,
          corpo: item.corpo,
          nivel: item.nivel,
          tipo: item.tipo,
          ordem: item.ordem,
          url: item.url ?? null,
          ativo: true,
        },
      });
    }
    this.logger.log(`Conteudo seed ensured (${CONTEUDO_SEED.length} items)`);
  }

  async findAll(userId: string, nivel?: string) {
    const items = await this.prisma.conteudo.findMany({
      where: {
        ativo: true,
        ...(nivel ? { nivel } : {}),
      },
      orderBy: [{ nivel: 'asc' }, { ordem: 'asc' }, { titulo: 'asc' }],
      include: {
        usuarios: {
          where: { idUsuario: userId },
          take: 1,
        },
      },
    });

    return items.map((item) => this.toDto(item, item.usuarios[0] ?? null));
  }

  async findOne(userId: string, id: string) {
    const item = await this.prisma.conteudo.findFirst({
      where: { id, ativo: true },
      include: {
        usuarios: {
          where: { idUsuario: userId },
          take: 1,
        },
      },
    });
    if (!item) throw new NotFoundException('Conteúdo não encontrado');
    return this.toDto(item, item.usuarios[0] ?? null, true);
  }

  async findBySlug(userId: string, slug: string) {
    const item = await this.prisma.conteudo.findFirst({
      where: { slug, ativo: true },
      include: {
        usuarios: {
          where: { idUsuario: userId },
          take: 1,
        },
      },
    });
    if (!item) throw new NotFoundException('Conteúdo não encontrado');
    return this.toDto(item, item.usuarios[0] ?? null, true);
  }

  async updateProgresso(userId: string, idConteudo: string, dto: UpdateProgressoConteudoDto) {
    const conteudo = await this.prisma.conteudo.findFirst({
      where: { id: idConteudo, ativo: true },
    });
    if (!conteudo) throw new NotFoundException('Conteúdo não encontrado');

    const progresso = dto.progresso ?? (dto.concluido ? 100 : 0);
    const concluido = dto.concluido ?? progresso >= 100;

    const row = await this.prisma.usuarioConteudo.upsert({
      where: {
        idUsuario_idConteudo: { idUsuario: userId, idConteudo },
      },
      create: {
        idUsuario: userId,
        idConteudo,
        progresso,
        concluido,
        dataAcesso: new Date(),
      },
      update: {
        progresso,
        concluido,
        dataAcesso: new Date(),
      },
    });

    return {
      idConteudo,
      progresso: Number(row.progresso),
      concluido: row.concluido,
      dataAcesso: row.dataAcesso.toISOString(),
    };
  }

  async continueLearning(userId: string) {
    const inProgress = await this.prisma.usuarioConteudo.findMany({
      where: {
        idUsuario: userId,
        concluido: false,
        progresso: { gt: 0 },
      },
      include: { conteudo: true },
      orderBy: { dataAcesso: 'desc' },
      take: 4,
    });

    if (inProgress.length > 0) {
      return inProgress
        .filter((row) => row.conteudo.ativo)
        .map((row) => this.toDto(row.conteudo, row));
    }

    return this.findAll(userId).then((all) => all.slice(0, 4));
  }

  private toDto(
    item: Conteudo,
    progresso: Pick<UsuarioConteudo, 'progresso' | 'concluido' | 'dataAcesso'> | null,
    includeCorpo = false,
  ) {
    return {
      id: item.id,
      titulo: item.titulo,
      descricao: item.descricao,
      ...(includeCorpo ? { corpo: item.corpo } : {}),
      nivel: item.nivel,
      tipo: item.tipo,
      slug: item.slug,
      ordem: item.ordem,
      url: item.url,
      capaUrl: item.capaUrl,
      dataPublicacao: item.dataPublicacao?.toISOString() ?? null,
      ativo: item.ativo,
      progresso: progresso
        ? {
            valor: Number(progresso.progresso),
            concluido: progresso.concluido,
            dataAcesso: progresso.dataAcesso.toISOString(),
          }
        : null,
    };
  }
}
