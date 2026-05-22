import type { DiagnosisSyncItem } from '@workspace/types';
import { createHash } from 'crypto';

/** Canonical SHA-256 fingerprint for idempotent diagnosis sync. */
export function hashDiagnosesContent(diagnoses: DiagnosisSyncItem[]): string {
  const canonical = diagnoses
    .filter((d) => d.icdCodeId)
    .map((d) => ({
      icdCodeId: d.icdCodeId,
      notes: d.notes?.trim() ?? '',
      isPrimary: Boolean(d.isPrimary),
    }))
    .sort((a, b) => (a.icdCodeId! > b.icdCodeId! ? 1 : -1));
  return createHash('sha256')
    .update(JSON.stringify(canonical))
    .digest('hex')
    .slice(0, 32);
}
