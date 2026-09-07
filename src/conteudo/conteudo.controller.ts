import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { ConteudoService } from './conteudo.service';
import { UpdateProgressoConteudoDto } from './dto/conteudo.dto';

@ApiTags('conteudo')
@ApiBearerAuth()
@Controller('conteudo')
export class ConteudoController {
  constructor(private readonly conteudoService: ConteudoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar conteúdos educativos ativos' })
  findAll(@CurrentUser() user: AuthUser, @Query('nivel') nivel?: string) {
    return this.conteudoService.findAll(user.id, nivel);
  }

  @Get('continuar')
  @ApiOperation({ summary: 'Conteúdos em andamento ou sugestões iniciais' })
  continuar(@CurrentUser() user: AuthUser) {
    return this.conteudoService.continueLearning(user.id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Obter conteúdo por slug' })
  findBySlug(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.conteudoService.findBySlug(user.id, slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter conteúdo por id' })
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.conteudoService.findOne(user.id, id);
  }

  @Patch(':id/progresso')
  @ApiOperation({ summary: 'Atualizar progresso de consumo do conteúdo' })
  updateProgresso(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgressoConteudoDto,
  ) {
    return this.conteudoService.updateProgresso(user.id, id, dto);
  }
}
