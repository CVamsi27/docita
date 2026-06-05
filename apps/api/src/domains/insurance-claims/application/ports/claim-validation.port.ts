/**
 * Claim-readiness gate the insurance-claims domain depends on without importing
 * billing internals. Billing supplies the implementation via DI so the
 * cross-domain edge stays an application port (AGENTS.md AJ4).
 */
export interface IClaimValidation {
  assertClaimReady(invoiceId: string, clinicId?: string): Promise<void>;
}

export const CLAIM_VALIDATION_PORT = 'IClaimValidation';
