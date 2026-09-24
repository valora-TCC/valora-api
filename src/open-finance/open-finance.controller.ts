import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { CreateConnectionDto, DemoConnectDto, WidgetTokenDto } from './dto/open-finance.dto';
import { OpenFinanceService } from './open-finance.service';

@ApiTags('open-finance')
@ApiBearerAuth()
@Controller('open-finance')
export class OpenFinanceController {
  constructor(private readonly openFinanceService: OpenFinanceService) {}

  @Post('widget-token')
  createWidgetToken(@CurrentUser() user: AuthUser, @Body() dto: WidgetTokenDto) {
    return this.openFinanceService.createWidgetToken(user.id, user.email, dto);
  }

  @Get('connections')
  listConnections(@CurrentUser() user: AuthUser) {
    return this.openFinanceService.listConnections(user.id);
  }

  @Post('connections')
  createConnection(@CurrentUser() user: AuthUser, @Body() dto: CreateConnectionDto) {
    return this.openFinanceService.createConnection(user.id, dto);
  }

  @Delete('connections/:id')
  disconnect(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.openFinanceService.disconnect(user.id, id);
  }

  @Get('accounts')
  listAccounts(@CurrentUser() user: AuthUser) {
    return this.openFinanceService.listAccounts(user.id);
  }

  @Get('transactions')
  listTransactions(@CurrentUser() user: AuthUser) {
    return this.openFinanceService.listOpenFinanceTransactions(user.id);
  }

  @Post('demo')
  @HttpCode(200)
  seedDemo(@CurrentUser() user: AuthUser, @Body() dto: DemoConnectDto) {
    return this.openFinanceService.seedDemo(user.id, user.email, dto);
  }

  @Post('sync/:connectionId')
  @HttpCode(200)
  sync(@CurrentUser() user: AuthUser, @Param('connectionId', ParseUUIDPipe) connectionId: string) {
    return this.openFinanceService.sync(user.id, connectionId);
  }
}
