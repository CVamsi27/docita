export type TabularRow = Array<string | number | Date | undefined>;

export interface ExcelRow {
  [key: string]: string | number | Date | undefined;
}

export interface MappedPatientData {
  firstName?: string;
  lastName?: string;
  'First Name'?: string;
  'Last Name'?: string;
  name?: string;
  phoneNumber?: string;
  'Phone Number'?: string;
  phone?: string;
  gender?: string;
  Gender?: string;
  dateOfBirth?: string | number | Date;
  'Date of Birth'?: string | number | Date;
  dob?: string | number | Date;
  email?: string;
  Email?: string;
  'email address'?: string;
  address?: string;
  Address?: string;
  bloodGroup?: string;
  'Blood Group'?: string;
  allergies?: string;
  Allergies?: string;
  medicalHistory?: string;
  'Medical History'?: string;
  invoiceTotal?: string | number;
  'Invoice Total'?: string | number;
  invoiceGrandTotal?: string | number;
  'Invoice Grand Total'?: string | number;
  invoiceLineItems?: string;
  'Invoice Line Items'?: string;
  invoiceItems?: string;
}

export interface ImportAuditContext {
  ipAddress?: string;
  userAgent?: string;
  createdBy?: string;
  dpdpNoticeVersion?: string;
  /** Persisted on Consent.notes when provided (e.g. bulk job id). */
  source?: string;
}

/** Row shape from CSV/XLSX bulk import (header-keyed records). */
export type BulkImportRow = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason: string;
  existingPatient?: { id: string; name: string; phone: string };
}

/** Thrown when a patient row matches an existing record (counted as skipped in bulk jobs). */
export class DuplicateImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateImportError';
  }
}
