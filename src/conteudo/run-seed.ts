import { PrismaClient } from '../generated/prisma';
import { CONTEUDO_SEED } from './conteudo.seed';

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const item of CONTEUDO_SEED) {
      await prisma.conteudo.upsert({
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
    console.log(`Conteudo seed ensured (${CONTEUDO_SEED.length} items)`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
