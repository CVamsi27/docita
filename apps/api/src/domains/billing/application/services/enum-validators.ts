import { Specialization, HospitalRole } from '@workspace/db';

export function validateSpecialization(
  value: string | null | undefined,
): Specialization | null {
  if (!value) return null;

  if (Object.values(Specialization).includes(value as Specialization)) {
    return value as Specialization;
  }

  return null;
}

export function validateHospitalRole(
  value: string | null | undefined,
): HospitalRole | null {
  if (!value) return null;

  if (Object.values(HospitalRole).includes(value as HospitalRole)) {
    return value as HospitalRole;
  }

  return null;
}
