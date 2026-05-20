import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { BulkImportRowError } from './bulk-import.types';

function isBulkImportRowError(value: unknown): value is BulkImportRowError {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BulkImportRowError>;
  return (
    typeof candidate.rowNumber === 'number' &&
    typeof candidate.error === 'string'
  );
}

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
    const rawErrors: unknown[] = Array.isArray(job.errors)
      ? [...job.errors]
      : [];
    const errors = rawErrors.filter(isBulkImportRowError);
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
