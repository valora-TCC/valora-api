import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { BelvoClient } from './belvo/belvo.client';
import { CategorizationService } from './categorization/categorization.service';
import { OpenFinanceController } from './open-finance.controller';
import { OpenFinanceSyncService } from './open-finance-sync.service';
import { OpenFinanceService } from './open-finance.service';
import { BelvoWebhooksController } from './webhooks/belvo-webhooks.controller';
import { BelvoWebhooksService } from './webhooks/belvo-webhooks.service';

@Module({
  imports: [UsersModule],
  controllers: [OpenFinanceController, BelvoWebhooksController],
  providers: [
    BelvoClient,
    CategorizationService,
    OpenFinanceSyncService,
    OpenFinanceService,
    BelvoWebhooksService,
  ],
  exports: [OpenFinanceService, OpenFinanceSyncService],
})
export class OpenFinanceModule {}
