import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClaimStatus } from '@workspace/db';
import { getPatientFullName } from '@workspace/utils';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  INSURANCE_CLAIM_REPOSITORY_TOKEN,
  type IInsuranceClaimRepository,
} from '@/domains/insurance-claims/core/repositories/insurance-claim.repository';
import {
  CLAIM_SUBMISSION_GATEWAY_TOKEN,
  type ClaimSubmissionPayload,
  type IClaimSubmissionGateway,
} from '@/domains/insurance-claims/application/ports/claim-submission-gateway.port';

/**
 * How long a caller may hold a submission claim before another worker may take
 * it over. A live claim is never stolen; only an expired one is, which recovers
 * a process that died mid-send without letting two workers file the same claim.
 */
const CLAIM_SUBMISSION_LEASE_MS = 10 * 60 * 1000;

/** Upper bound on delivery attempts, so a permanently rejected claim stops. */
const MAX_CLAIM_SUBMISSION_ATTEMPTS = 5;

/** Claims one retry sweep handles. */
const CLAIM_SUBMISSION_RETRY_BATCH = 25;

type ClaimSubmissionOutcome =
  | 'SUBMITTED'
  | 'SUBMISSION_PENDING'
  | 'ALREADY_SENT'
  | 'NOT_ELIGIBLE';

interface ClaimSubmissionSummary {
  attempted: number;
  sent: number;
  failed: number;
  abandoned: number;
}

/**
 * Delivering a claim to its insurer.
 *
 * `SUBMITTED` on a claim previously meant only "marked submitted locally". The
 * transition, the audit event and the row were all written together, so a claim
 * read as filed to the insurer whether or not anything ever left the building —
 * and a crash before transmission left it that way permanently, because nothing
 * tracked the delivery.
 *
 * Delivery is now a separately claimed, separately recorded fact with its own
 * lease and retry ceiling. Recording what the insurer decided is the job of
 * {@link InsuranceClaimDecisionCommandService}.
 */
@Injectable()
export class InsuranceClaimSubmissionCommandService {
  private readonly logger = new Logger(
    InsuranceClaimSubmissionCommandService.name,
  );

  constructor(
    @Inject(INSURANCE_CLAIM_REPOSITORY_TOKEN)
    private readonly repository: IInsuranceClaimRepository,
    @Inject(CLAIM_SUBMISSION_GATEWAY_TOKEN)
    private readonly gateway: IClaimSubmissionGateway,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Files a submitted claim with its insurer, at most once.
   *
   * The claim token is taken before anything is sent, so a second caller cannot
   * file the same claim twice; it returns `ALREADY_SENT` instead of erroring,
   * because a double-clicked Submit is a no-op rather than a fault.
   */
  async submitClaim(
    claimId: string,
    clinicId: string,
  ): Promise<ClaimSubmissionOutcome> {
    const now = this.clock.now();
    const leaseExpiredBefore = new Date(
      now.getTime() - CLAIM_SUBMISSION_LEASE_MS,
    );
    const claimToken = randomUUID();

    const claimed = await this.repository.claimSubmission(
      claimId,
      clinicId,
      claimToken,
      now,
      leaseExpiredBefore,
    );
    if (!claimed) {
      const existing = await this.repository.findById(claimId, clinicId);
      if (!existing) {
        throw new NotFoundException(`Insurance claim ${claimId} not found`);
      }
      if (existing.status !== ClaimStatus.SUBMITTED) return 'NOT_ELIGIBLE';
      return 'ALREADY_SENT';
    }

    const sent = await this.deliver(claimId, clinicId, claimToken);
    return sent ? 'SUBMITTED' : 'SUBMISSION_PENDING';
  }

  /**
   * Re-attempts delivery for claims that are submitted but unconfirmed.
   *
   * Safe to run on a timer: the claim, not the caller's timing, is what prevents
   * a duplicate filing.
   */
  async retryPendingSubmissions(): Promise<ClaimSubmissionSummary> {
    const now = this.clock.now();
    const leaseExpiredBefore = new Date(
      now.getTime() - CLAIM_SUBMISSION_LEASE_MS,
    );
    const pending = await this.repository.findPendingSubmissions(
      leaseExpiredBefore,
      CLAIM_SUBMISSION_RETRY_BATCH,
    );

    let sent = 0;
    let failed = 0;
    let abandoned = 0;

    for (const row of pending) {
      if (row.submissionAttempts >= MAX_CLAIM_SUBMISSION_ATTEMPTS) {
        abandoned += 1;
        this.logger.error(
          `Abandoning claim submission for ${row.id} after ${MAX_CLAIM_SUBMISSION_ATTEMPTS} attempts`,
        );
        continue;
      }

      const claimToken = randomUUID();
      const claimed = await this.repository.claimSubmission(
        row.id,
        row.clinicId,
        claimToken,
        now,
        leaseExpiredBefore,
      );
      if (!claimed) continue;

      if (await this.deliver(row.id, row.clinicId, claimToken)) {
        sent += 1;
      } else {
        failed += 1;
      }
    }

    return { attempted: pending.length, sent, failed, abandoned };
  }

  /** Sends the claim only if this caller still holds the submission claim. */
  private async deliver(
    claimId: string,
    clinicId: string,
    claimToken: string,
  ): Promise<boolean> {
    const claim = await this.repository.findById(claimId, clinicId);
    if (!claim) {
      await this.settle(
        claimId,
        clinicId,
        claimToken,
        'FAILED',
        'Claim not found',
      );
      return false;
    }

    const payload: ClaimSubmissionPayload = {
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      clinicId: claim.clinicId,
      insurerName: claim.insurerName,
      policyNumber: claim.policyNumber,
      currency: claim.currency,
      claimedAmountCents: claim.claimedAmountCents,
      patient: {
        id: claim.patient?.id ?? claim.patientId,
        fullName: getPatientFullName(claim.patient),
        phoneNumber: claim.patient?.phoneNumber ?? null,
      },
    };

    try {
      const result = await this.gateway.submit(payload);
      await this.settle(
        claimId,
        clinicId,
        claimToken,
        'SENT',
        null,
        result?.externalReference ?? null,
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // A failed filing is outstanding work, not a rejected claim: the claim
      // stays SUBMITTED and the sweep retries it.
      this.logger.error(
        `Failed to file insurance claim ${claimId} with the insurer`,
        error,
      );
      await this.settle(claimId, clinicId, claimToken, 'FAILED', message);
      return false;
    }
  }

  private async settle(
    claimId: string,
    clinicId: string,
    claimToken: string,
    status: 'SENT' | 'FAILED',
    error: string | null,
    externalReference: string | null = null,
  ): Promise<void> {
    try {
      await this.repository.settleSubmission(claimId, clinicId, claimToken, {
        status,
        now: this.clock.now(),
        externalReference,
        error,
      });
    } catch (settleError) {
      // The send already happened; losing the bookkeeping must not throw over
      // it, but the row will read as in-flight so it must be loud.
      this.logger.error(
        `Failed to record submission outcome for claim ${claimId}`,
        settleError,
      );
    }
  }
}
