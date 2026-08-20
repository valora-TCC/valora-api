import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificacoesService } from './notificacoes.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [NotificacoesService],
})
export class NotificacoesModule {}
