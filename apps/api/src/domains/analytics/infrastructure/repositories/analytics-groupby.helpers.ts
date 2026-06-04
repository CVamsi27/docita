import { isRecord } from '@workspace/utils';
import { readGroupCount } from './analytics-groupby-count';
import { normalizeGender } from './analytics-gender-groupby';

export function mapAppointmentStatusGroupRows(
  rows: unknown[],
): Array<{ status: string; count: number }> {
  return rows.flatMap((row) => {
    if (!isRecord(row) || typeof row.status !== 'string') {
      return [];
    }
    return [{ status: row.status, count: readGroupCount(row, 'id') }];
  });
}

export function mapAppointmentTypeGroupRows(
  rows: unknown[],
): Array<{ type: string; count: number }> {
  return rows.flatMap((row) => {
    if (!isRecord(row) || typeof row.type !== 'string') {
      return [];
    }
    return [{ type: row.type, count: readGroupCount(row, 'id') }];
  });
}

export function mapPatientGenderGroupRows(
  rows: unknown[],
): Array<{ gender: 'MALE' | 'FEMALE' | 'OTHER' | null; count: number }> {
  return rows.flatMap((row) => {
    if (!isRecord(row) || !('gender' in row)) {
      return [];
    }
    return [
      {
        gender: normalizeGender(row.gender),
        count: readGroupCount(row, '_all'),
      },
    ];
  });
}
