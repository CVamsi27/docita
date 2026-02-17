import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Query,
  UsePipes,
  BadRequestException,
} from '@nestjs/common';
import { BulkImportService, BulkImportEntityType } from './bulk-import.service';
import { Role } from '@workspace/db';
import { Roles } from '../auth/roles.decorator';
import type { AuthenticatedRequest } from '@workspace/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  BulkImportRequestSchema,
  BulkImportRequestDto,
} from '../common/dto/common.dto';

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
  @UsePipes(new ZodValidationPipe(BulkImportRequestSchema))
  async startBulkImport(
    @Req() req: AuthenticatedRequest,
    @Body()
    data: BulkImportRequestDto,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new BadRequestException('Clinic ID is required for bulk import');
    }
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
