import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveBelvoConfig } from '../belvo/belvo.config';
import type { BelvoWebhookPayload } from '../belvo/belvo.types';
import { OpenFinanceSyncService } from '../open-finance-sync.service';

const SYNC_WEBHOOK_TYPES = new Set(['ACCOUNTS', 'TRANSACTIONS', 'OWNERS']);
const SYNC_WEBHOOK_CODES = new Set([
  'historical_update',
  'recurrent_update',
  'new_transactions_available',
  'historical_update_progress_complete',
]);

@Injectable()
export class BelvoWebhooksService {
  private readonly logger = new Logger(BelvoWebhooksService.name);
  private readonly webhookSecret: string | undefined;

  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly syncService: OpenFinanceSyncService,
  ) {
    this.webhookSecret = resolveBelvoConfig(configService).webhookSecret;
  }

  assertAuthorized(authorizationHeader?: string): void {
    if (!this.webhookSecret) {
      throw new UnauthorizedException('Webhook Belvo não configurado');
    }
    const expected = this.webhookSecret.startsWith('Bearer ')
      ? this.webhookSecret
      : `Bearer ${this.webhookSecret}`;
    const provided = authorizationHeader?.trim();
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Webhook inválido');
    }
  }

  async handle(payload: BelvoWebhookPayload) {
    const linkId = payload.link_id;
    const webhookId = payload.webhook_id;
    const webhookType = payload.webhook_type ?? 'UNKNOWN';
    const webhookCode = payload.webhook_code ?? payload.process_type ?? 'UNKNOWN';
    const eventKey =
      webhookId ??
      `${linkId ?? 'nolink'}:${webhookType}:${webhookCode}:${JSON.stringify(payload.data ?? {}).slice(0, 80)}`;

    const existing = await this.prisma.eventoSyncOpenFinance.findUnique({
      where: { eventKey },
    });
    if (existing && (existing.status === 'PROCESSED' || existing.status === 'PROCESSING')) {
      return { accepted: true, duplicate: true };
    }

    const conexao = linkId
      ? await this.prisma.conexaoOpenFinance.findUnique({ where: { belvoLinkId: linkId } })
      : null;

    const evento = existing
      ? await this.prisma.eventoSyncOpenFinance.update({
          where: { id: existing.id },
          data: { status: 'PROCESSING' },
        })
      : await this.prisma.eventoSyncOpenFinance.create({
          data: {
            idConexao: conexao?.id,
            webhookId: webhookId ?? null,
            eventKey,
            webhookType,
            webhookCode,
            status: 'PROCESSING',
          },
        });

    const shouldSync =
      Boolean(linkId) &&
      SYNC_WEBHOOK_TYPES.has(webhookType) &&
      (SYNC_WEBHOOK_CODES.has(webhookCode) || webhookType === 'TRANSACTIONS');

    if (!shouldSync || !linkId) {
      await this.prisma.eventoSyncOpenFinance.update({
        where: { id: evento.id },
        data: {
          status: 'IGNORED',
          detalhe: 'Evento recebido sem ação de sync',
          dataProcessamento: new Date(),
        },
      });
      return { accepted: true, synced: false };
    }

    try {
      await this.syncService.syncByBelvoLinkId(linkId);
      await this.prisma.eventoSyncOpenFinance.update({
        where: { id: evento.id },
        data: {
          status: 'PROCESSED',
          idConexao: conexao?.id,
          dataProcessamento: new Date(),
          detalhe: null,
        },
      });
      return { accepted: true, synced: true };
    } catch {
      this.logger.warn(`Webhook sync failed for link ${linkId}`);
      await this.prisma.eventoSyncOpenFinance.update({
        where: { id: evento.id },
        data: {
          status: 'FAILED',
          detalhe: 'Falha ao processar sincronização',
          dataProcessamento: new Date(),
        },
      });
      return { accepted: true, synced: false, failed: true };
    }
  }
}
