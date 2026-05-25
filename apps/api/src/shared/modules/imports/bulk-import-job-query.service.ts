import { Injectable, NotFoundException } from '@nestjs/common';
import { bulkImportJobErrorsJsonSchema } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import type { BulkImportRowError } from './bulk-import.types';

@Injectable()
export class BulkImportJobQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getJobStatus(
    jobId: string,
    clinicId: string,
  ): Promise<{
    jobId: string;
    status: string;
    entityType: string;
    fileName: string;
    totalRows: number;
    processedRows: number;
    successRows: number;
    failedRows: number;
    skippedRows: number;
    errors: BulkImportRowError[];
    errorSummary: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    durationMs: number | null;
  }> {
    const job = await this.prisma.bulkImportJob.findFirst({
      where: { id: jobId, clinicId },
    });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    const errors =
      parsePrismaJsonColumn(job.errors, bulkImportJobErrorsJsonSchema) ?? [];
    return {
      jobId: job.id,
      status: job.status,
      entityType: job.entityType,
      fileName: job.fileName,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      successRows: job.successRows,
      failedRows: job.failedRows,
      skippedRows: job.skippedRows,
      errors,
      errorSummary: job.errorSummary,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      durationMs: job.duration,
    };
  }
}
