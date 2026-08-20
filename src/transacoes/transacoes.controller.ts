import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import {
  CreateTransacaoDto,
  ListTransacoesQueryDto,
  UpdateTransacaoDto,
} from './dto/transacao.dto';
import { TransacoesService } from './transacoes.service';

@ApiTags('transacoes')
@ApiBearerAuth()
@Controller('transacoes')
export class TransacoesController {
  constructor(private readonly transacoesService: TransacoesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListTransacoesQueryDto) {
    return this.transacoesService.findAll(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.transacoesService.findOne(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTransacaoDto) {
    return this.transacoesService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransacaoDto,
  ) {
    return this.transacoesService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.transacoesService.remove(user.id, id);
  }
}
