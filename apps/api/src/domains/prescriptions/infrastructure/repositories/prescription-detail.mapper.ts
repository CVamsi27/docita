import type { PrescriptionDetail } from '@/domains/prescriptions/core/repositories/prescription.repository.interface';

/** check-as-cast-density: allow-file — Prisma `findFirst` include shape is wider than {@link PrescriptionDetail}. */
export function mapPrescriptionDetailRow(
  row: unknown,
): PrescriptionDetail | null {
  if (!row) return null;
  return row as PrescriptionDetail;
}
