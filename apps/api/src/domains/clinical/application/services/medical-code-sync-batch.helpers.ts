import type {
  MedicalCodeSyncRecord,
  SyncedMedicalCodeRecord,
} from '@/domains/clinical/core/repositories/clinical.repository.interface';

/** Deduplicates one provider page by code, keeping the last row for a code. */
export function dedupeCodesByCode<T extends { code: string }>(
  records: T[],
): T[] {
  return [...new Map(records.map((record) => [record.code, record])).values()];
}

interface CodeChangeSet<TCode extends MedicalCodeSyncRecord> {
  toCreate: TCode[];
  /** Rows the catalog already has but whose stored copy is stale. */
  toUpdate: TCode[];
}

/**
 * Splits a page into rows to insert and rows whose stored copy differs.
 *
 * A row is unchanged only when description, category and the common flag all
 * match; anything else is refreshed so a corrected description or a promotion
 * to "common" propagates on the next sync.
 */
export function selectCodeChanges<TCode extends MedicalCodeSyncRecord>(
  records: TCode[],
  existingRecords: SyncedMedicalCodeRecord[],
): CodeChangeSet<TCode> {
  const existingByCode = new Map(
    existingRecords.map((record) => [record.code, record]),
  );
  const toCreate: TCode[] = [];
  const toUpdate: TCode[] = [];

  for (const record of records) {
    const existing = existingByCode.get(record.code);
    if (!existing) {
      toCreate.push(record);
      continue;
    }

    if (
      existing.description !== record.description ||
      existing.category !== record.category ||
      !existing.isCommon
    ) {
      toUpdate.push(record);
    }
  }

  return { toCreate, toUpdate };
}

/** Splits rows into fixed-size write batches. */
export function chunkRecords<T>(records: T[], size: number): T[][] {
  if (size <= 0) throw new Error('Batch size must be positive');
  const batches: T[][] = [];
  for (let index = 0; index < records.length; index += size) {
    batches.push(records.slice(index, index + size));
  }
  return batches;
}
