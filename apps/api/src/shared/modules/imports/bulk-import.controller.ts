import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Query,
  UsePipes,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { BulkImportService } from './bulk-import.service';
import type { BulkImportEntityType } from '@workspace/types';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import type { AuthenticatedRequest, BulkImportRequest } from '@workspace/types';
import { bulkImportRequestSchema } from '@workspace/types';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { BulkImportJobStatusResponseDto } from './dto/bulk-import.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('imports')
@Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.INTERNAL)
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

  @Get('bulk/:jobId')
  @ZodSerializerDto(BulkImportJobStatusResponseDto)
  async getBulkJobStatus(
    @Param('jobId') jobId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new BadRequestException('Clinic ID is required');
    }
    const job = await this.bulkImportService.getJobStatus(jobId, clinicId);
    return {
      jobId: job.jobId,
      status: job.status,
      entityType: job.entityType,
      fileName: job.fileName,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      successRows: job.successRows,
      failedRows: job.failedRows,
      skippedRows: job.skippedRows,
      errors: job.errors,
      errorSummary: job.errorSummary ?? undefined,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      durationMs: job.durationMs,
    };
  }

  @Post('bulk')
  @UsePipes(new ZodValidationPipe(bulkImportRequestSchema))
  async startBulkImport(
    @Req() req: AuthenticatedRequest,
    @Body() data: BulkImportRequest,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new BadRequestException('Clinic ID is required for bulk import');
    }
    const userId = req.user.id;

    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(data.fileBase64, 'base64');
    } catch {
      throw new BadRequestException('Invalid fileBase64 payload');
    }
    if (fileBuffer.length === 0) {
      throw new BadRequestException('Decoded file is empty');
    }

    return this.bulkImportService.startImport(
      clinicId,
      userId,
      data.entityType,
      data.fileName,
      fileBuffer,
    );
  }
}
