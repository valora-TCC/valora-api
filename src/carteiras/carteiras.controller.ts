import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { CarteirasService } from './carteiras.service';
import { CreateCarteiraDto, UpdateCarteiraDto } from './dto/carteira.dto';

@ApiTags('carteiras')
@ApiBearerAuth()
@Controller('carteiras')
export class CarteirasController {
  constructor(private readonly carteirasService: CarteirasService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.carteirasService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.carteirasService.findOne(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCarteiraDto) {
    return this.carteirasService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCarteiraDto,
  ) {
    return this.carteirasService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.carteirasService.remove(user.id, id);
  }
}
