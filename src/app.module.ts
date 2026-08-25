import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { CarteirasModule } from './carteiras/carteiras.module';
import { CategoriasModule } from './categorias/categorias.module';
import { TransacoesModule } from './transacoes/transacoes.module';
import { MetasModule } from './metas/metas.module';
import { OrcamentosModule } from './orcamentos/orcamentos.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { InvestmentsModule } from './investments/investments.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { MarketModule } from './market/market.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    HealthModule,
    UsersModule,
    CarteirasModule,
    CategoriasModule,
    TransacoesModule,
    MetasModule,
    OrcamentosModule,
    DashboardModule,
    InvestmentsModule,
    NotificacoesModule,
    MarketModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
