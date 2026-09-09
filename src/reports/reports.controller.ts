import { Controller, Get, Header, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { ExportReportDto } from './dto/export-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('export')
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Cache-Control', 'no-store')
  async export(
    @CurrentUser() user: AuthUser,
    @Query() query: ExportReportDto,
  ): Promise<StreamableFile> {
    const file = await this.reportsService.export(user.id, query);
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }
}
