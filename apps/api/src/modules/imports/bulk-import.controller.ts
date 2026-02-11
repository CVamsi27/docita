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
import { Role } from '@workspace/db';
import { Roles } from '../auth/roles.decorator';
import type { AuthenticatedRequest } from '@workspace/types';

@Controller('imports')
@Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
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
    @Req() req: AuthenticatedRequest,
    @Body()
    data: {
      entityType: BulkImportEntityType;
      fileName: string;
      fileBuffer: Buffer;
    },
  ) {
    const clinicId = req.user?.clinicId || ''; // Handle potential undefined safely
    const userId = req.user.userId;

    return this.bulkImportService.startImport(
      clinicId,
      userId,
      data.entityType,
      data.fileName,
      Buffer.from(data.fileBuffer),
    );
  }
}
