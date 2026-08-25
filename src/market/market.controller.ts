import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { MarketService } from './market.service';

@ApiTags('market')
@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Public()
  @Get('summary')
  @ApiOperation({ summary: 'Cotações, taxas e notícias financeiras (público)' })
  summary() {
    return this.marketService.getSummary();
  }
}
