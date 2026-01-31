/**
 * Strategy interface for bulk import operations.
 * Enables extensible import handling with proper separation of concerns.
 */
export interface IImportStrategy {
  /**
   * Entity type this strategy handles.
   */
  readonly entityType: string;

  /**
   * Validate a single row of import data.
   * @returns Validation result with valid flag and optional error message.
   */
  validate(row: Record<string, unknown>): ImportValidationResult;

  /**
   * Import a single row of data.
   * @param row - The parsed CSV row data
   * @param clinicId - The clinic context for the import
   * @returns Promise that resolves when import is complete
   */
  import(row: Record<string, unknown>, clinicId: string): Promise<void>;

  /**
   * Get template headers for CSV generation.
   */
  getTemplate(): Record<string, string>;
}

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
}
