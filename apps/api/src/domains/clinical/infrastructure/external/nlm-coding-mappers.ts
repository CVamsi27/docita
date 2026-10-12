import type { IcdCode, CptCode } from '@workspace/db';

export type CodeSystem = 'ICD' | 'HCPCS';
export type NlmCodeRow = { code: string; description: string };

const ICD_CATEGORY_MAP: Record<string, string> = {
  A: 'Infectious Diseases',
  B: 'Infectious Diseases',
  C: 'Neoplasms',
  D: 'Neoplasms',
  E: 'Endocrine',
  F: 'Mental Health',
  G: 'Nervous System',
  H: 'Eye and Ear',
  I: 'Circulatory',
  J: 'Respiratory',
  K: 'Digestive',
  L: 'Skin',
  M: 'Musculoskeletal',
  N: 'Genitourinary',
  O: 'Pregnancy',
  P: 'Perinatal',
  Q: 'Congenital',
  R: 'Symptoms',
  S: 'Injury',
  T: 'Injury',
  V: 'External Causes',
  W: 'External Causes',
  X: 'External Causes',
  Y: 'External Causes',
  Z: 'Health Factors',
};

const SYNTHETIC_DATE = new Date(0);

/**
 * Catalog systems for rows this mapper produces. Kept as literals rather than
 * read from Prisma because these mappers build unsaved, in-memory code objects;
 * the persisted provenance is stamped later by the sync repository.
 */
const ICD_SYSTEM_VERSION = 'ICD-10-CM';
const ICD_VERSION_LABEL = 'ICD-10';
const CPT_SYSTEM_VERSION = 'HCPCS';
/** Rows built outside a sync have no known upstream. */
const UNKNOWN_SOURCE = 'UNKNOWN';

export function cptCategory(code: string): string {
  if (/^[A-Z]/i.test(code)) return 'HCPCS';
  const num = parseInt(code, 10);
  if (!Number.isFinite(num)) return 'Other';
  if (num >= 99201 && num <= 99499) return 'Evaluation and Management';
  if (num >= 10004 && num <= 69990) return 'Surgery';
  if (num >= 70010 && num <= 79999) return 'Radiology';
  if (num >= 80047 && num <= 89398) return 'Laboratory';
  if (num >= 90281 && num <= 99199) return 'Medicine';
  if (num >= 100 && num <= 1999) return 'Anesthesia';
  return 'Other';
}

export function toNlmRows(data: unknown): NlmCodeRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const codes = Array.isArray(data[1])
    ? data[1].filter((code): code is string => typeof code === 'string')
    : [];
  const displayRows = Array.isArray(data[3]) ? data[3] : [];

  return codes
    .map((code, idx) => {
      const rawRow = displayRows[idx];
      const row = Array.isArray(rawRow)
        ? rawRow.filter((cell): cell is string => typeof cell === 'string')
        : [];
      const description =
        row.find((value, rowIndex) => rowIndex > 0 && value)?.trim() ??
        row[1]?.trim() ??
        '';
      return { code: code.trim(), description };
    })
    .filter((row) => !!row.code);
}

export function mapIcd(
  code: string,
  description: string,
  isCommon: boolean,
): IcdCode {
  return {
    id: code,
    code,
    description,
    category: ICD_CATEGORY_MAP[code[0].toUpperCase()] ?? 'Other',
    version: ICD_VERSION_LABEL,
    isCommon,
    system: ICD_SYSTEM_VERSION,
    source: UNKNOWN_SOURCE,
    sourceVersion: null,
    lastSyncedAt: null,
    createdAt: SYNTHETIC_DATE,
    updatedAt: SYNTHETIC_DATE,
  };
}

export function mapCpt(
  code: string,
  description: string,
  isCommon: boolean,
): CptCode {
  return {
    id: code,
    code,
    description,
    category: cptCategory(code),
    isCommon,
    price: 0,
    version: CPT_SYSTEM_VERSION,
    system: CPT_SYSTEM_VERSION,
    source: UNKNOWN_SOURCE,
    sourceVersion: null,
    lastSyncedAt: null,
    createdAt: SYNTHETIC_DATE,
    updatedAt: SYNTHETIC_DATE,
  };
}

export function readTotalFromNlmResponse(data: unknown): number {
  return Array.isArray(data) && typeof data[0] === 'number' ? data[0] : 0;
}
