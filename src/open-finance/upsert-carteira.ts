import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { pickReusableCarteira } from './ledger-identity';

export type UpsertOpenFinanceCarteiraInput = {
  userId: string;
  connectionId: string;
  idContaExterna: string;
  nome: string;
  descricao: string;
  instituicaoOf: string;
  tipoContaOf: string | null;
  moedaOf: string;
  saldoAtual: Prisma.Decimal | number;
};

export async function upsertOpenFinanceCarteira(
  prisma: PrismaService,
  input: UpsertOpenFinanceCarteiraInput,
) {
  const occupied = await prisma.carteira.findFirst({
    where: { idContaExterna: input.idContaExterna },
  });
  if (occupied && occupied.idUsuario !== input.userId) {
    throw new BadRequestException('Conta externa já associada a outro usuário');
  }

  const owned = await prisma.carteira.findMany({
    where: { idUsuario: input.userId },
  });
  const reusable = pickReusableCarteira(
    owned,
    input.userId,
    input.nome,
    input.idContaExterna,
  );

  if (occupied && reusable && occupied.id !== reusable.id) {
    await prisma.carteira.update({
      where: { id: occupied.id },
      data: {
        idContaExterna: null,
        idConexaoOf: null,
        ativo: false,
      },
    });
  }

  const targetId = reusable?.id ?? occupied?.id;
  const data = {
    nome: reusable?.nome ?? input.nome,
    descricao: input.descricao,
    idConexaoOf: input.connectionId,
    instituicaoOf: input.instituicaoOf,
    tipoContaOf: input.tipoContaOf,
    moedaOf: input.moedaOf.slice(0, 3),
    saldoAtual: input.saldoAtual,
    ativo: true,
    idContaExterna: input.idContaExterna,
  };

  if (targetId) {
    return prisma.carteira.update({
      where: { id: targetId },
      data,
    });
  }

  return prisma.carteira.create({
    data: {
      idUsuario: input.userId,
      ...data,
    },
  });
}
