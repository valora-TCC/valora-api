import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import {
  CreateOrcamentoDto,
  UpdateOrcamentoDto,
  UpsertOrcamentoCategoriaDto,
} from './dto/orcamento.dto';
import { OrcamentosService } from './orcamentos.service';

@ApiTags('orcamentos')
@ApiBearerAuth()
@Controller('orcamentos')
export class OrcamentosController {
  constructor(private readonly orcamentosService: OrcamentosService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.orcamentosService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.orcamentosService.findOne(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrcamentoDto) {
    return this.orcamentosService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrcamentoDto,
  ) {
    return this.orcamentosService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.orcamentosService.remove(user.id, id);
  }

  @Post(':id/categorias')
  upsertCategoria(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertOrcamentoCategoriaDto,
  ) {
    return this.orcamentosService.upsertCategoria(user.id, id, dto);
  }

  @Delete(':id/categorias/:idOrcCategoria')
  removeCategoria(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('idOrcCategoria', ParseUUIDPipe) idOrcCategoria: string,
  ) {
    return this.orcamentosService.removeCategoria(user.id, id, idOrcCategoria);
  }
}
