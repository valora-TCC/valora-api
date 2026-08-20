import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

/**
 * BPMN: verificação a cada 24h de contas próximas do vencimento.
 * D-010: o modelo físico não tem data_vencimento — o job não inventa coluna
 * nem envia e-mail/push nesta etapa.
 */
@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);

  @Cron('0 8 * * *')
  verificarContasVencendo(): void {
    this.logger.debug(
      'Scheduler 24h preparado (RF-035). Sem data_vencimento no modelo físico; job permanece no-op até decisão de produto.',
    );
  }
}
