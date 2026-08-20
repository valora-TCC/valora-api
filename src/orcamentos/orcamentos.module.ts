import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { OrcamentosController } from './orcamentos.controller';
import { OrcamentosService } from './orcamentos.service';

@Module({
  imports: [UsersModule],
  controllers: [OrcamentosController],
  providers: [OrcamentosService],
  exports: [OrcamentosService],
})
export class OrcamentosModule {}
