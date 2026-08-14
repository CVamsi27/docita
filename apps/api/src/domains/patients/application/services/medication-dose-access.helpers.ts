import { NotFoundException } from '@nestjs/common';
import type { IMedicationDoseRepository } from '@/domains/patients/core/repositories/medication-dose.repository.interface';

export async function verifyMedicationDosePatientAccess(
  repository: IMedicationDoseRepository,
  clinicId: string,
  patientId: string,
): Promise<void> {
  const found = await repository.verifyPatientAccess(patientId, clinicId);
  if (!found) throw new NotFoundException('Patient not found');
}
