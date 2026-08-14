import type { ClinicTier, ClinicType } from '@workspace/db';

/**
 * Shared clinic CRUD payload shapes. `ClinicDataCommandService` and the
 * `ClinicsService` facade both accept these — defining them once keeps the
 * facade's pass-through signatures from drifting out of sync with the
 * command service it delegates to.
 */
export interface CreateClinicData {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  tier?: ClinicTier;
  type?: ClinicType;
  settings?: unknown;
}

export interface UpdateClinicData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  tier?: ClinicTier;
  type?: ClinicType;
  settings?: unknown;
}

export interface JoinClinicData {
  clinicCode?: string;
  clinicEmail?: string;
}
