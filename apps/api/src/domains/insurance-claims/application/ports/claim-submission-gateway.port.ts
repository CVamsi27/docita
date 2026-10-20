/**
 * What the insurer returned when a claim was filed.
 *
 * `externalReference` is the only evidence a successful filing produces, so it
 * is recorded on the claim rather than being logged and forgotten.
 */
export type ClaimSubmissionResult = {
  externalReference?: string | null;
};

/**
 * Files a claim with an insurer.
 *
 * The domain depends on this port rather than on a provider SDK so submission
 * can be tested, and so an integration can be swapped without touching claim
 * state. A delivery is only ever attempted by a caller holding the submission
 * claim, which is what keeps this from double-filing.
 */
export interface IClaimSubmissionGateway {
  submit(claim: ClaimSubmissionPayload): Promise<ClaimSubmissionResult>;
}

export interface ClaimSubmissionPayload {
  claimId: string;
  claimNumber: string | null;
  clinicId: string | null;
  insurerName: string;
  policyNumber: string;
  currency: string;
  claimedAmountCents: number;
  patient: { id: string; fullName: string; phoneNumber: string | null };
}

export const CLAIM_SUBMISSION_GATEWAY_TOKEN = 'IClaimSubmissionGateway';
