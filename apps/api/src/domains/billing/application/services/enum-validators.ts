import { Specialization, HospitalRole } from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';

const SPECIALIZATION_MEMBERS = Object.values(Specialization);
const HOSPITAL_ROLE_MEMBERS = Object.values(HospitalRole);

export function validateSpecialization(
  value: string | null | undefined,
): Specialization | null {
  if (!value) return null;
  return parseStringEnumMember(SPECIALIZATION_MEMBERS, value);
}

export function validateHospitalRole(
  value: string | null | undefined,
): HospitalRole | null {
  if (!value) return null;
  return parseStringEnumMember(HOSPITAL_ROLE_MEMBERS, value);
}
