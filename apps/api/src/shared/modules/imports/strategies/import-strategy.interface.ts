export interface ImportStrategyAuditContext {
  ipAddress?: string;
  userAgent?: string;
  createdBy?: string;
  /** Required for PATIENT strategies. Persisted on the DPDP Consent row. */
  dpdpNoticeVersion?: string;
  /** Free-form provenance string for the Consent row's `notes` field. */
  source?: string;
}

export interface IImportStrategy {
  readonly entityType: string;

  validate(row: Record<string, unknown>): ImportValidationResult;

  import(
    row: Record<string, unknown>,
    clinicId: string,
    audit: ImportStrategyAuditContext,
  ): Promise<void>;

  getTemplate(): Record<string, string>;
}

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
}
