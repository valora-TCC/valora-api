import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BelvoClient } from './belvo/belvo.client';
import type { BelvoAccount, BelvoTransaction } from './belvo/belvo.types';
import { CategorizationService } from './categorization/categorization.service';
import { displayInstitutionName } from './institution-display';
import { parseCivilDateTime } from '../common/date-range';
import { upsertOpenFinanceCarteira } from './upsert-carteira';

@Injectable()
export class OpenFinanceSyncService {
  private readonly logger = new Logger(OpenFinanceSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly belvo: BelvoClient,
    private readonly categorization: CategorizationService,
  ) {}

  async syncConnection(connectionId: string, userId?: string) {
    const conexao = await this.prisma.conexaoOpenFinance.findFirst({
      where: {
        id: connectionId,
        ...(userId ? { idUsuario: userId } : {}),
        status: { not: 'DISCONNECTED' },
      },
    });
    if (!conexao) {
      throw new NotFoundException('Conexão Open Finance não encontrada');
    }

    await this.prisma.conexaoOpenFinance.update({
      where: { id: conexao.id },
      data: { status: 'SYNCING', ultimoErro: null },
    });

    // Demo connections are refreshed by OpenFinanceService.sync (full ledger re-seed).
    // Keep a no-op here only if syncService is invoked directly for a demo link.
    if (conexao.belvoLinkId.startsWith('demo-')) {
      const updated = await this.prisma.conexaoOpenFinance.update({
        where: { id: conexao.id },
        data: {
          status: 'ACTIVE',
          ultimaSincronizacao: new Date(),
          ultimoErro: null,
        },
      });
      return {
        connection: updated,
        accountsImported: 0,
        transactionsImported: 0,
        transactionsSkipped: 0,
        demo: true as const,
      };
    }

    try {
      const accounts = await this.belvo.listAccounts(conexao.belvoLinkId);
      const accountMap = await this.upsertAccounts(conexao.id, conexao.idUsuario, accounts);

      const transactions = await this.belvo.listTransactions(conexao.belvoLinkId);
      const imported = await this.upsertTransactions(conexao.idUsuario, accountMap, transactions);

      // Belvo balance is authoritative for OF-linked carteiras after import.
      await this.applyBelvoBalances(accountMap, accounts);

      const updated = await this.prisma.conexaoOpenFinance.update({
        where: { id: conexao.id },
        data: {
          status: 'ACTIVE',
          ultimaSincronizacao: new Date(),
          ultimoErro: null,
        },
      });

      return {
        connection: updated,
        accountsImported: accountMap.size,
        transactionsImported: imported.created,
        transactionsSkipped: imported.skipped,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao sincronizar dados Open Finance';
      this.logger.warn(`Sync failed for connection ${conexao.id}: ${message}`);
      await this.prisma.conexaoOpenFinance.update({
        where: { id: conexao.id },
        data: { status: 'ERROR', ultimoErro: 'Falha na sincronização. Tente novamente.' },
      });
      throw error;
    }
  }

  async syncByBelvoLinkId(belvoLinkId: string) {
    const conexao = await this.prisma.conexaoOpenFinance.findUnique({
      where: { belvoLinkId },
    });
    if (!conexao || conexao.status === 'DISCONNECTED') {
      this.logger.warn(`No active connection for link ${belvoLinkId}`);
      return null;
    }
    return this.syncConnection(conexao.id);
  }

  private async upsertAccounts(
    connectionId: string,
    userId: string,
    accounts: BelvoAccount[],
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();

    for (const account of accounts) {
      const institutionName = this.institutionLabel(account);
      const nome =
        account.name?.trim() ||
        account.category?.trim() ||
        account.type?.trim() ||
        `Conta ${institutionName}`;
      const saldo = this.extractBalance(account);

      const saved = await upsertOpenFinanceCarteira(this.prisma, {
        userId,
        connectionId,
        idContaExterna: account.id,
        nome,
        descricao: `Open Finance · ${institutionName}`,
        instituicaoOf: institutionName,
        tipoContaOf: account.type ?? account.category ?? null,
        moedaOf: account.currency ?? 'BRL',
        saldoAtual: saldo,
      });
      map.set(account.id, saved.id);
    }

    return map;
  }

  private async upsertTransactions(
    userId: string,
    accountMap: Map<string, string>,
    transactions: BelvoTransaction[],
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const tx of transactions) {
      const accountId = typeof tx.account === 'string' ? tx.account : tx.account?.id;
      if (!accountId || !tx.id) {
        skipped += 1;
        continue;
      }
      const carteiraId = accountMap.get(accountId);
      if (!carteiraId) {
        skipped += 1;
        continue;
      }

      const existing = await this.prisma.transacao.findUnique({
        where: { idExterno: tx.id },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      const amount = Number(tx.amount);
      if (!Number.isFinite(amount) || amount === 0) {
        skipped += 1;
        continue;
      }

      const tipo = amount < 0 ? 'DESPESA' : 'RECEITA';
      const valor = new Prisma.Decimal(Math.abs(amount).toFixed(2));
      if (valor.lte(0)) {
        skipped += 1;
        continue;
      }

      const description =
        tx.description?.trim() || tx.merchant?.merchant_name?.trim() || 'Transação Open Finance';
      const idCategoria = await this.categorization.resolveCategoryId(userId, description, tipo);
      const dataTransacao = this.parseDate(tx.value_date ?? tx.accounting_date);

      try {
        await this.prisma.transacao.create({
          data: {
            idCarteira: carteiraId,
            idCategoria,
            tipo,
            valor,
            descricao: description.slice(0, 500),
            dataTransacao,
            origem: 'OPEN_FINANCE',
            idExterno: tx.id,
            provedor: 'BELVO',
          },
        });
        created += 1;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          skipped += 1;
          continue;
        }
        throw error;
      }
    }

    return { created, skipped };
  }

  private async applyBelvoBalances(accountMap: Map<string, string>, accounts: BelvoAccount[]) {
    for (const account of accounts) {
      const carteiraId = accountMap.get(account.id);
      if (!carteiraId) continue;
      const saldo = this.extractBalance(account);
      await this.prisma.carteira.update({
        where: { id: carteiraId },
        data: { saldoAtual: saldo },
      });
    }
  }

  private extractBalance(account: BelvoAccount): Prisma.Decimal {
    const raw = account.balance?.current ?? account.balance?.available ?? 0;
    const n = Number(raw);
    if (!Number.isFinite(n)) return new Prisma.Decimal(0);
    return new Prisma.Decimal(n.toFixed(2));
  }

  private institutionLabel(account: BelvoAccount): string {
    const raw =
      typeof account.institution === 'string'
        ? account.institution
        : (account.institution?.name ?? 'Instituição');
    return displayInstitutionName(raw);
  }

  private parseDate(value?: string | null): Date {
    return parseCivilDateTime(value);
  }
}
