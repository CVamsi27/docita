import {
  Controller,
  Post,
  Body,
  UseGuards as _UseGuards,
  Req,
  Get,
  Query,
  UsePipes,
  BadRequestException,
} from '@nestjs/common';
import { BulkImportService, BulkImportEntityType } from './bulk-import.service';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import type { AuthenticatedRequest } from '@workspace/types';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import {
  BulkImportRequestSchema,
  BulkImportRequestDto,
} from '@/common/dto/common.dto';

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

    const validEntityTypes: BulkImportEntityType[] = [
      'PATIENT',
      'PRESCRIPTION',
      'DOCTOR',
      'LAB_TEST',
      'INVENTORY',
    ];
    if (!validEntityTypes.includes(data.entityType as BulkImportEntityType)) {
      throw new BadRequestException(`Invalid entity type: ${data.entityType}`);
    }

    return this.bulkImportService.startImport(
      clinicId,
      userId,
      data.entityType as BulkImportEntityType,
      data.fileName,
      Buffer.from(data.fileBuffer),
    );
  }
}
