import { Injectable, Logger } from '@nestjs/common';
import {
  type ClaimSubmissionPayload,
  type ClaimSubmissionResult,
  type IClaimSubmissionGateway,
} from '@/domains/insurance-claims/application/ports/claim-submission-gateway.port';

/**
 * Default gateway used until an insurer integration is configured.
 *
 * It deliberately fails rather than reporting success. Claim delivery is the
 * fact the whole submission track exists to prove, so an unconfigured clinic
 * must end up with a retryable FAILED claim and a loud log, not a claim that
 * reads as filed with the insurer.
 */
@Injectable()
export class UnconfiguredClaimSubmissionGateway implements IClaimSubmissionGateway {
  private readonly logger = new Logger(UnconfiguredClaimSubmissionGateway.name);
  private warned = false;

  async submit(claim: ClaimSubmissionPayload): Promise<ClaimSubmissionResult> {
    if (!this.warned) {
      this.warned = true;
      this.logger.warn(
        'No insurer submission gateway is configured. Claims will stay in a retryable failed state rather than being recorded as filed.',
      );
    }
    throw new Error(
      `No insurer submission gateway is configured; cannot file claim ${claim.claimId}`,
    );
  }
}
