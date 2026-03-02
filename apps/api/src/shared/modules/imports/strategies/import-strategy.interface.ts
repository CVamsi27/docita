export interface IImportStrategy {
  readonly entityType: string;

  validate(row: Record<string, unknown>): ImportValidationResult;

  import(row: Record<string, unknown>, clinicId: string): Promise<void>;

  getTemplate(): Record<string, string>;
}

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
}
