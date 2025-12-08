import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Query,
} from '@nestjs/common';
import { BulkImportService, BulkImportEntityType } from './bulk-import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('imports')
@UseGuards(JwtAuthGuard)
export class BulkImportController {
  constructor(private readonly bulkImportService: BulkImportService) {}

  @Get('template')
  getTemplate(@Query('entityType') entityType: BulkImportEntityType) {
    const csv = this.bulkImportService.generateCSVTemplate(entityType);
    return {
      template: csv,
      format: 'csv',
    };
  }

  @Post('bulk')
  async startBulkImport(
    @Req() req: any,
    @Body()
    data: {
      entityType: BulkImportEntityType;
      fileName: string;
      fileBuffer: Buffer;
    },
  ) {
    const clinicId = req.user?.clinicId;
    const userId = req.user?.id;

    return this.bulkImportService.startImport(
      clinicId,
      userId,
      data.entityType,
      data.fileName,
      Buffer.from(data.fileBuffer),
    );
  }
}
