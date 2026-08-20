import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { MetasController } from './metas.controller';
import { MetasService } from './metas.service';

@Module({
  imports: [UsersModule],
  controllers: [MetasController],
  providers: [MetasService],
  exports: [MetasService],
})
export class MetasModule {}
