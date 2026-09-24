import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import type { BelvoWebhookPayload } from '../belvo/belvo.types';
import { BelvoWebhooksService } from './belvo-webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class BelvoWebhooksController {
  constructor(private readonly webhooksService: BelvoWebhooksService) {}

  @Public()
  @Post('belvo')
  @HttpCode(202)
  async handleBelvo(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: BelvoWebhookPayload,
  ) {
    this.webhooksService.assertAuthorized(authorization);
    const result = await this.webhooksService.handle(body ?? {});
    return result;
  }
}
