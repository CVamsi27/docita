/**
 * Registry for jurisdiction-specific doctor registration verification.
 * Start with the configured HTTP provider in DoctorVerificationService; add
 * state council adapters incrementally (supports + verify).
 */

export type DoctorVerificationAdapterContext = {
  doctorId: string;
  name: string;
  registrationNumber: string;
  registrationCouncil?: string | null;
  registrationStateCode?: string | null;
  licenseNumber?: string | null;
};

export type DoctorVerificationAdapterResult = {
  verified: boolean;
  referenceId?: string;
  reason?: string;
  source?: string;
  data?: unknown;
};

export interface DoctorVerificationAdapter {
  readonly id: string;
  supports(context: DoctorVerificationAdapterContext): boolean;
  verify(
    context: DoctorVerificationAdapterContext,
  ): Promise<DoctorVerificationAdapterResult>;
}
