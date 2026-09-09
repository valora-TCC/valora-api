import { Module } from '@nestjs/common';
import { CarteirasModule } from '../carteiras/carteiras.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { MetasModule } from '../metas/metas.module';
import { OrcamentosModule } from '../orcamentos/orcamentos.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [MetasModule, OrcamentosModule, CarteirasModule, DashboardModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
