import { Module } from '@nestjs/common';
import { MarketModule } from '../market/market.module';
import { UsersModule } from '../users/users.module';
import { SimulacoesController } from './simulacoes.controller';
import { SimulacoesService } from './simulacoes.service';

@Module({
  imports: [UsersModule, MarketModule],
  controllers: [SimulacoesController],
  providers: [SimulacoesService],
  exports: [SimulacoesService],
})
export class SimulacoesModule {}
