import { isRecord } from '@workspace/utils';

export function mapAppointmentStatusGroupRows(
  rows: unknown[],
): Array<{ status: string; count: number }> {
  return rows.flatMap((row) => {
    if (!isRecord(row) || typeof row.status !== 'string') {
      return [];
    }
    const countBlock = row._count;
    const count =
      isRecord(countBlock) && typeof countBlock.id === 'number'
        ? countBlock.id
        : 0;
    return [{ status: row.status, count }];
  });
}

export function mapAppointmentTypeGroupRows(
  rows: unknown[],
): Array<{ type: string; count: number }> {
  return rows.flatMap((row) => {
    if (!isRecord(row) || typeof row.type !== 'string') {
      return [];
    }
    const countBlock = row._count;
    const count =
      isRecord(countBlock) && typeof countBlock.id === 'number'
        ? countBlock.id
        : 0;
    return [{ type: row.type, count }];
  });
}

export function mapPatientGenderGroupRows(
  rows: unknown[],
): Array<{ gender: 'MALE' | 'FEMALE' | 'OTHER' | null; count: number }> {
  return rows.flatMap((row) => {
    if (!isRecord(row) || !('gender' in row)) {
      return [];
    }
    const gender = row.gender;
    const normalizedGender =
      gender === 'MALE' || gender === 'FEMALE' || gender === 'OTHER'
        ? gender
        : gender === null
          ? null
          : null;
    const countBlock = row._count;
    const count =
      isRecord(countBlock) && typeof countBlock._all === 'number'
        ? countBlock._all
        : 0;
    return [{ gender: normalizedGender, count }];
  });
}
