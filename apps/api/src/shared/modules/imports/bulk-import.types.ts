import type { BulkImportEntityType } from '@workspace/types';
import type { BulkImportRow } from './import-types';

export interface BulkImportAuditContext {
  ipAddress?: string;
  userAgent?: string;
  /** Required when importing PATIENT rows. Persisted on every created Consent. */
  dpdpNoticeVersion?: string;
}

export interface BulkImportJobData {
  jobId: string;
  clinicId: string;
  userId: string;
  entityType: BulkImportEntityType;
  fileName: string;
  rows: BulkImportRow[];
  totalRows: number;
  audit?: BulkImportAuditContext;
}

export interface BulkImportRowError {
  rowNumber: number;
  error: string;
}
