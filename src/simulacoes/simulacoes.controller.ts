import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { CreateSimulacaoDto, PreviewSimulacaoDto } from './dto/simulacao.dto';
import { SimulacoesService } from './simulacoes.service';

@ApiTags('simulacoes')
@ApiBearerAuth()
@Controller('simulacoes')
export class SimulacoesController {
  constructor(private readonly simulacoesService: SimulacoesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar simulações do usuário' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.simulacoesService.findAll(user.id);
  }

  @Get('taxas-sugeridas')
  @ApiOperation({ summary: 'Taxas Selic/CDI sugeridas a partir do BCB' })
  taxasSugeridas() {
    return this.simulacoesService.taxasSugeridas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter simulação' })
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.simulacoesService.findOne(user.id, id);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Calcular simulação sem salvar' })
  preview(@Body() dto: PreviewSimulacaoDto) {
    return this.simulacoesService.preview(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Criar e salvar simulação de juros' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSimulacaoDto) {
    return this.simulacoesService.create(user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover simulação' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.simulacoesService.remove(user.id, id);
  }
}
