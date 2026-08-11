import { Injectable } from '@nestjs/common';
import type { OcrImportCommitRequest } from '@workspace/types';
import {
  PATIENT_FIELD_MAPPINGS,
  type ImportPreview,
  type ImportResult,
} from '@workspace/utils';
import { ImportPreviewService } from './import-preview.service';
import { PatientTabularImportService } from './patient-tabular-import.service';
import { ImportOcrWorkflowService } from './import-ocr-workflow.service';
import { OcrImportCommitService } from './ocr-import-commit.service';
import type { ImportAuditContext } from './import-types';

export { PATIENT_FIELD_MAPPINGS };

/**
 * Facade — tabular preview/import, OCR extraction, and OCR commit orchestration.
 */
@Injectable()
export class ImportsService {
  constructor(
    private readonly previewService: ImportPreviewService,
    private readonly tabularImport: PatientTabularImportService,
    private readonly ocrWorkflow: ImportOcrWorkflowService,
    private readonly ocrCommit: OcrImportCommitService,
  ) {}

  previewImport(filePath: string): Promise<ImportPreview> {
    return this.previewService.previewImport(filePath);
  }

  processPatientImport(
    filePath: string,
    clinicId: string | undefined,
    columnMapping: Record<string, string> | undefined,
    audit: ImportAuditContext,
  ): Promise<ImportResult> {
    return this.tabularImport.processPatientImport(
      filePath,
      clinicId,
      columnMapping,
      audit,
    );
  }

  processMedicalDocumentOcr(filePath: string, clinicId?: string) {
    return this.ocrWorkflow.processMedicalDocumentOcr(filePath, clinicId);
  }

  extractFromMedicalDocumentBasic(filePath: string, clinicId?: string) {
    return this.ocrWorkflow.extractFromMedicalDocumentBasic(filePath, clinicId);
  }

  commitOcrImport(dto: OcrImportCommitRequest, audit: ImportAuditContext) {
    return this.ocrCommit.commitOcrImport(dto, audit);
  }
}
