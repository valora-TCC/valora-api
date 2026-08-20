import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { CarteirasController } from './carteiras.controller';
import { CarteirasService } from './carteiras.service';

@Module({
  imports: [UsersModule],
  controllers: [CarteirasController],
  providers: [CarteirasService],
  exports: [CarteirasService],
})
export class CarteirasModule {}
