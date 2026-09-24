import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

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
