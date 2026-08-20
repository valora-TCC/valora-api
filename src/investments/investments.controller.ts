import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import {
  CreateInvestmentDto,
  CreateInvestmentTransactionDto,
  UpdateInvestmentDto,
} from './dto/investment.dto';
import { InvestmentsService } from './investments.service';

@ApiTags('investments')
@ApiBearerAuth()
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.investmentsService.findAll(user.id);
  }

  @Post('transactions')
  addTransaction(@CurrentUser() user: AuthUser, @Body() dto: CreateInvestmentTransactionDto) {
    return this.investmentsService.addTransaction(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.investmentsService.findOne(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvestmentDto) {
    return this.investmentsService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvestmentDto,
  ) {
    return this.investmentsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.investmentsService.remove(user.id, id);
  }
}
