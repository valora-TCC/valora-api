import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ConteudoController } from './conteudo.controller';
import { ConteudoService } from './conteudo.service';

@Module({
  imports: [UsersModule],
  controllers: [ConteudoController],
  providers: [ConteudoService],
  exports: [ConteudoService],
})
export class ConteudoModule {}
