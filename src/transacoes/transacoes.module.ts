import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { OrcamentosModule } from '../orcamentos/orcamentos.module';
import { TransacoesController } from './transacoes.controller';
import { TransacoesService } from './transacoes.service';

@Module({
  imports: [UsersModule, OrcamentosModule],
  controllers: [TransacoesController],
  providers: [TransacoesService],
  exports: [TransacoesService],
})
export class TransacoesModule {}
