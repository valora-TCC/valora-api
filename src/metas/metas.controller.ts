import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { CreateMetaDto, CreateProgressoMetaDto, UpdateMetaDto } from './dto/meta.dto';
import { MetasService } from './metas.service';

@ApiTags('metas')
@ApiBearerAuth()
@Controller('metas')
export class MetasController {
  constructor(private readonly metasService: MetasService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.metasService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.metasService.findOne(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMetaDto) {
    return this.metasService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMetaDto,
  ) {
    return this.metasService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.metasService.remove(user.id, id);
  }

  @Post(':id/progressos')
  registrarProgresso(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgressoMetaDto,
  ) {
    return this.metasService.registrarProgresso(user.id, id, dto);
  }
}
