import type {
  AbhaVerificationResult,
  VerifyAbhaRequest,
} from '@workspace/types';

export const ABDM_GATEWAY = Symbol('ABDM_GATEWAY');
export const ABHA_VERIFICATION_STORE = Symbol('ABHA_VERIFICATION_STORE');

/**
 * Outbound port to the ABDM gateway. Implementations verify an ABHA identity
 * and return the canonical result. When ABDM is not configured, implementations
 * MUST return `{ verified: false, error: 'ABDM_NOT_CONFIGURED' }` rather than
 * throw, so callers can surface a clear "not enabled" state.
 */
export interface IAbdmGateway {
  /** True when ABDM credentials are configured (gateway can actually call out). */
  isConfigured(): boolean;
  verifyAbha(input: VerifyAbhaRequest): Promise<AbhaVerificationResult>;

  /**
   * Request OTP for ABHA login via mobile number.
   * Returns a transaction ID used to complete verification.
   */
  requestOtp(
    mobile: string,
  ): Promise<{ txnId: string; maskedTarget: string | null }>;

  /**
   * Verify OTP to complete ABHA login and return the verification result.
   */
  verifyOtp(txnId: string, otp: string): Promise<AbhaVerificationResult>;
}

/** Minimal persistence port for ABHA verification state on a patient. */
export interface IAbhaVerificationStore {
  isClinicAbdmEnabled(clinicId: string): Promise<boolean>;

  findPatientForVerification(
    patientId: string,
    clinicId: string,
  ): Promise<{ id: string; abhaAddress: string | null } | null>;

  saveVerification(
    patientId: string,
    clinicId: string,
    data: {
      abhaAddress: string | null;
      abhaNumber: string | null;
      abhaKycName: string | null;
      abhaVerifiedAt: Date;
    },
  ): Promise<void>;
}
