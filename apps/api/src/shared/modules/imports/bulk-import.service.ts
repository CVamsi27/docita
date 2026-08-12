import { Injectable } from '@nestjs/common';
import type { BulkImportEntityType } from '@workspace/types';
import { ImportFileParserService } from './import-file-parser.service';
import { BulkImportStrategyRegistry } from './bulk-import-strategy.registry';
import { BulkImportJobQueryService } from './bulk-import-job-query.service';
import { BulkImportJobProcessorService } from './bulk-import-job-processor.service';
import { BulkImportOrchestratorService } from './bulk-import-orchestrator.service';
import type {
  BulkImportAuditContext,
  BulkImportJobData,
} from './bulk-import.types';

/**
 * Facade — bulk import job start, status, and CSV templates.
 */
@Injectable()
export class BulkImportService {
  constructor(
    private readonly jobQuery: BulkImportJobQueryService,
    private readonly jobProcessor: BulkImportJobProcessorService,
    private readonly orchestrator: BulkImportOrchestratorService,
    private readonly fileParser: ImportFileParserService,
    private readonly strategyRegistry: BulkImportStrategyRegistry,
  ) {}

  getJobStatus(jobId: string, clinicId: string) {
    return this.jobQuery.getJobStatus(jobId, clinicId);
  }

  /** @internal Used by tests and scheduled job runner. */
  processImport(jobData: BulkImportJobData) {
    return this.jobProcessor.processImport(jobData);
  }

  startImport(
    clinicId: string,
    userId: string,
    entityType: BulkImportEntityType,
    fileName: string,
    fileBuffer: Buffer,
    audit: BulkImportAuditContext = {},
  ) {
    return this.orchestrator.startImport(
      clinicId,
      userId,
      entityType,
      fileName,
      fileBuffer,
      audit,
    );
  }

  getImportTemplate(entityType: BulkImportEntityType): Record<string, string> {
    return this.strategyRegistry.getTemplate(entityType);
  }

  generateCSVTemplate(entityType: BulkImportEntityType): string {
    const template = this.getImportTemplate(entityType);
    return this.fileParser.generateCsvHeaderLine(Object.keys(template));
  }
}
