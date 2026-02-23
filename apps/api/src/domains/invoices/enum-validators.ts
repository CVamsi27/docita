// Enum validation helpers for Invoice service

import { Specialization, HospitalRole } from '@workspace/db';

/**
 * Safely validate and convert a string to Specialization enum or null
 */
export function validateSpecialization(
  value: string | null | undefined,
): Specialization | null {
  if (!value) return null;

  // Check if the value is a valid Specialization enum value
  if (Object.values(Specialization).includes(value as Specialization)) {
    return value as Specialization;
  }

  return null;
}

/**
 * Safely validate and convert a string to HospitalRole enum or null
 */
export function validateHospitalRole(
  value: string | null | undefined,
): HospitalRole | null {
  if (!value) return null;

  // Check if the value is a valid HospitalRole enum value
  if (Object.values(HospitalRole).includes(value as HospitalRole)) {
    return value as HospitalRole;
  }

  return null;
}
