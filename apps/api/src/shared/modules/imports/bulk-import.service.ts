import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import type { BulkImportEntityType } from '@workspace/types';
import { nanoid } from 'nanoid';
import { ImportFileParserService } from './import-file-parser.service';
import { BulkImportStrategyRegistry } from './bulk-import-strategy.registry';
import type { BulkImportRow } from './import-types';
import { DuplicateImportError } from './import-types';
import type { ImportStrategyAuditContext } from './strategies/import-strategy.interface';

export type { BulkImportEntityType };

export interface BulkImportAuditContext {
  ipAddress?: string;
  userAgent?: string;
  /** Required when importing PATIENT rows. Persisted on every created Consent. */
  dpdpNoticeVersion?: string;
}

interface BulkImportJobData {
  jobId: string;
  clinicId: string;
  userId: string;
  entityType: BulkImportEntityType;
  fileName: string;
  rows: BulkImportRow[];
  totalRows: number;
  audit?: BulkImportAuditContext;
}

interface ImportError {
  rowNumber: number;
  error: string;
}

@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name);
  private readonly lastImportTimes = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: AppConfigService,
    private readonly fileParser: ImportFileParserService,
    private readonly strategyRegistry: BulkImportStrategyRegistry,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

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
    errors: Array<{ rowNumber: number; error: string }>;
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
    const errors = Array.isArray(job.errors)
      ? (job.errors as Array<{ rowNumber: number; error: string }>)
      : [];
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

  async startImport(
    clinicId: string,
    userId: string,
    entityType: BulkImportEntityType,
    fileName: string,
    fileBuffer: Buffer,
    audit: BulkImportAuditContext = {},
  ): Promise<{ jobId: string; status: string; totalRows: number }> {
    try {
      const lastImportTime = this.lastImportTimes.get(clinicId);
      const { maxFileSize, maxRows, rateLimitInterval } =
        this.configService.getBulkImportConfig();

      if (
        lastImportTime &&
        Date.now() - lastImportTime < rateLimitInterval * 1000
      ) {
        throw new BadRequestException(
          `Please wait ${rateLimitInterval} seconds before starting another import`,
        );
      }

      if (fileBuffer.length > maxFileSize) {
        throw new BadRequestException(
          `File size exceeds limit of ${maxFileSize / 1024 / 1024}MB`,
        );
      }

      if (!this.strategyRegistry.isValidEntityType(entityType)) {
        throw new BadRequestException(
          `Invalid entity type: ${String(entityType)}`,
        );
      }

      const rows = await this.fileParser.parseBulkImportBuffer(
        fileName,
        fileBuffer,
      );

      if (rows.length > maxRows) {
        throw new BadRequestException(
          `Number of rows (${rows.length}) exceeds maximum limit of ${maxRows}`,
        );
      }

      const jobId = nanoid();

      await this.prisma.bulkImportJob.create({
        data: {
          id: jobId,
          clinicId,
          userId,
          entityType,
          fileName,
          fileSize: fileBuffer.length,
          originalKey: `inline:${jobId}`,
          status: 'QUEUED',
          totalRows: rows.length,
          processedRows: 0,
          successRows: 0,
          failedRows: 0,
          skippedRows: 0,
          errors: [],
        },
      });

      this.logger.log(
        `Starting bulk import: ${jobId} | Entity: ${entityType} | Rows: ${rows.length} | User: ${userId}`,
      );

      const jobData: BulkImportJobData = {
        jobId,
        clinicId,
        userId,
        entityType,
        fileName,
        rows,
        totalRows: rows.length,
        audit,
      };

      this.lastImportTimes.set(clinicId, Date.now());
      this.scheduleImport(jobData);

      return {
        jobId,
        status: 'QUEUED',
        totalRows: rows.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to start bulk import: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private scheduleImport(jobData: BulkImportJobData): void {
    setImmediate(() => {
      void this.processImport(jobData).catch((error) => {
        this.logger.error(
          `Error processing scheduled import job ${jobData.jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
        );
        void this.prisma.bulkImportJob
          .update({
            where: { id: jobData.jobId },
            data: {
              status: 'FAILED',
              errorSummary:
                error instanceof Error ? error.message : 'Unknown error',
              completedAt: this.clock.now(),
            },
          })
          .catch((updateError: unknown) => {
            this.logger.error(
              `Failed to mark scheduled import job ${jobData.jobId} as failed: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
              updateError instanceof Error ? updateError.stack : undefined,
            );
          });
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

    const errors: ImportError[] = [];
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
    errors: ImportError[];
  }> {
    const errors: ImportError[] = [];
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
        if (!validation.valid) {
          throw new Error(validation.error ?? 'Row validation failed');
        }

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

  getImportTemplate(entityType: BulkImportEntityType): Record<string, string> {
    return this.strategyRegistry.getTemplate(entityType);
  }

  generateCSVTemplate(entityType: BulkImportEntityType): string {
    const template = this.getImportTemplate(entityType);
    return this.fileParser.generateCsvHeaderLine(Object.keys(template));
  }
}
