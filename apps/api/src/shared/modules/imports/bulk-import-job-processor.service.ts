import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { BulkImportStrategyRegistry } from './bulk-import-strategy.registry';
import type { BulkImportRow } from './import-types';
import { DuplicateImportError } from './import-types';
import type {
  BulkImportAuditContext,
  BulkImportJobData,
  BulkImportRowError,
} from './bulk-import.types';
import type { ImportStrategyAuditContext } from './strategies/import-strategy.interface';

@Injectable()
export class BulkImportJobProcessorService {
  private readonly logger = new Logger(BulkImportJobProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly strategyRegistry: BulkImportStrategyRegistry,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  scheduleImport(
    jobData: BulkImportJobData,
    onFatalError: (error: unknown) => void,
  ): void {
    setImmediate(() => {
      void this.processImport(jobData).catch((error) => {
        this.logger.error(
          `Error processing scheduled import job ${jobData.jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
        );
        onFatalError(error);
      });
    });
  }

  async processImport(jobData: BulkImportJobData): Promise<void> {
    const { jobId, clinicId, userId, entityType, rows, totalRows } = jobData;
    const audit: BulkImportAuditContext = jobData.audit ?? {};
    const startedAtMs = Date.now();
    const strategy = this.strategyRegistry.get(entityType);

    await this.prisma.bulkImportJob.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: this.clock.now(),
      },
    });

    const errors: BulkImportRowError[] = [];
    let successCount = 0;
    let skippedCount = 0;

    try {
      const batchSize = 1000;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const batchResults = await this.processBatch(
          strategy,
          batch,
          clinicId,
          i,
          { userId, jobId, audit },
        );

        successCount += batchResults.successCount;
        skippedCount += batchResults.skippedCount;
        errors.push(...batchResults.errors);

        await this.prisma.bulkImportJob.update({
          where: { id: jobId },
          data: {
            processedRows: Math.min(i + batch.length, totalRows),
            successRows: successCount,
            failedRows: errors.length,
            skippedRows: skippedCount,
            errors: errors.map((entry) => ({
              rowNumber: entry.rowNumber,
              error: entry.error,
            })),
          },
        });
      }

      const failureCount = errors.length;
      const status =
        failureCount === totalRows
          ? 'FAILED'
          : failureCount > 0
            ? 'PARTIALLY_COMPLETED'
            : 'COMPLETED';

      await this.prisma.bulkImportJob.update({
        where: { id: jobId },
        data: {
          status,
          processedRows: totalRows,
          successRows: successCount,
          failedRows: failureCount,
          skippedRows: skippedCount,
          errors: errors.map((entry) => ({
            rowNumber: entry.rowNumber,
            error: entry.error,
          })),
          errorSummary:
            failureCount > 0
              ? `${failureCount} row(s) failed during import`
              : null,
          completedAt: this.clock.now(),
          duration: Date.now() - startedAtMs,
        },
      });

      this.logger.log(
        `Import job ${jobId} completed: ${successCount} success, ${skippedCount} skipped, ${failureCount} failed`,
      );
    } catch (error) {
      await this.prisma.bulkImportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorSummary:
            error instanceof Error ? error.message : 'Unknown error',
          completedAt: this.clock.now(),
          duration: Date.now() - startedAtMs,
          errors: errors.map((entry) => ({
            rowNumber: entry.rowNumber,
            error: entry.error,
          })),
        },
      });
      throw error;
    }
  }

  private async processBatch(
    strategy: import('./strategies/import-strategy.interface').IImportStrategy,
    rows: BulkImportRow[],
    clinicId: string,
    startRowNumber: number,
    ctx: { userId: string; jobId: string; audit: BulkImportAuditContext },
  ): Promise<{
    successCount: number;
    skippedCount: number;
    errors: BulkImportRowError[];
  }> {
    const errors: BulkImportRowError[] = [];
    let successCount = 0;
    let skippedCount = 0;

    const auditContext: ImportStrategyAuditContext = {
      ipAddress: ctx.audit.ipAddress,
      userAgent: ctx.audit.userAgent,
      createdBy: ctx.userId,
      dpdpNoticeVersion: ctx.audit.dpdpNoticeVersion,
      source: `Operator attestation via bulk import job ${ctx.jobId}`,
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = startRowNumber + i + 2;

      try {
        const validation = strategy.validate(row);
        if (!validation.valid)
          throw new Error(validation.error ?? 'Row validation failed');

        await strategy.import(row, clinicId, auditContext);
        successCount++;
      } catch (error) {
        if (error instanceof DuplicateImportError) {
          skippedCount++;
          continue;
        }

        errors.push({
          rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { successCount, skippedCount, errors };
  }
}
