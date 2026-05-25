import { ConflictException } from '@nestjs/common';
import type { IPatientRepository } from '@/domains/patients/core/repositories/patient.repository.interface';

export async function assertMrnAvailable(
  repository: IPatientRepository,
  mrn: string | undefined,
  clinicId: string,
  currentPatientId?: string,
): Promise<void> {
  if (!mrn) return;

  const existing = await repository.findByMrn(mrn, clinicId);
  if (existing && existing.id !== currentPatientId) {
    throw new ConflictException(
      'A patient with this MRN already exists in this clinic',
    );
  }
}
