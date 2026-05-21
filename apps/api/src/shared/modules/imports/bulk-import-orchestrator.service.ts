import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import type { BulkImportEntityType } from '@workspace/types';
import { nanoid } from 'nanoid';
import { ImportFileParserService } from './import-file-parser.service';
import { BulkImportStrategyRegistry } from './bulk-import-strategy.registry';
import { BulkImportJobProcessorService } from './bulk-import-job-processor.service';
import type {
  BulkImportAuditContext,
  BulkImportJobData,
} from './bulk-import.types';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class BulkImportOrchestratorService {
  private readonly logger = new Logger(BulkImportOrchestratorService.name);
  private readonly lastImportTimes = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: AppConfigService,
    private readonly fileParser: ImportFileParserService,
    private readonly strategyRegistry: BulkImportStrategyRegistry,
    private readonly jobProcessor: BulkImportJobProcessorService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

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
      this.jobProcessor.scheduleImport(jobData, (error) => {
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
              `Failed to mark scheduled import job ${jobData.jobId} failed: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
              updateError instanceof Error ? updateError.stack : undefined,
            );
          });
      });

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
}
