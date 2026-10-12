import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClaimEventSource, ClaimStatus } from '@workspace/db';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  INSURANCE_CLAIM_REPOSITORY_TOKEN,
  type IInsuranceClaimRepository,
} from '@/domains/insurance-claims/core/repositories/insurance-claim.repository';
import { InsuranceClaim } from '@/domains/insurance-claims/core/entities/insurance-claim.entity';

/**
 * Records a decision the insurer made, linked to the evidence for it.
 *
 * An approval, denial or settlement entered by a clinic user is a local
 * assertion. This accepts the same move but insists on the reference the
 * insurer gave, so the audit trail can say which decisions were the insurer's
 * and which were a human's. Applying it uses the same optimistic-concurrency
 * and atomic-event path as any other transition.
 */
@Injectable()
export class InsuranceClaimDecisionCommandService {
  constructor(
    @Inject(INSURANCE_CLAIM_REPOSITORY_TOKEN)
    private readonly repository: IInsuranceClaimRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async recordInsurerDecision(
    claimId: string,
    clinicId: string,
    decision: {
      targetStatus: ClaimStatus;
      externalReference: string;
      providerCode?: string | null;
      decidedAt?: Date;
      approvedAmountCents?: number;
      patientResponsibilityCents?: number;
      denialReason?: string;
      expectedVersion: number;
      actorUserId?: string;
    },
  ): Promise<void> {
    if (!decision.externalReference.trim()) {
      throw new NotFoundException(
        'An external reference is required to record an insurer decision.',
      );
    }

    const claim = await this.repository.findById(claimId, clinicId);
    if (!claim) {
      throw new NotFoundException(`Insurance claim ${claimId} not found`);
    }

    const entity = new InsuranceClaim({
      id: claim.id,
      claimType: claim.claimType,
      status: claim.status,
      claimedAmountCents: claim.claimedAmountCents,
      approvedAmountCents: claim.approvedAmountCents,
      patientResponsibilityCents: claim.patientResponsibilityCents,
      submittedAt: claim.submittedAt,
      respondedAt: claim.respondedAt,
      settledAt: claim.settledAt,
    });

    // The same invariants apply: the insurer cannot approve more than was
    // claimed, and a denial still needs a reason.
    const result = entity.transitionTo(decision.targetStatus, {
      now: decision.decidedAt ?? this.clock.now(),
      approvedAmountCents: decision.approvedAmountCents,
      patientResponsibilityCents: decision.patientResponsibilityCents,
      denialReason: decision.denialReason,
    });

    const updated = await this.repository.transition(
      claimId,
      clinicId,
      decision.expectedVersion,
      {
        status: result.status,
        ...(result.approvedAmountCents !== undefined
          ? { approvedAmountCents: result.approvedAmountCents }
          : {}),
        ...(result.patientResponsibilityCents !== undefined
          ? { patientResponsibilityCents: result.patientResponsibilityCents }
          : {}),
        ...(result.denialReason !== undefined
          ? { denialReason: result.denialReason }
          : {}),
        // The insurer's own reference is recorded on the claim, so a later
        // reconciliation can be matched against it.
        externalClaimReference: decision.externalReference.trim(),
      },
      {
        fromStatus: claim.status,
        toStatus: result.status,
        actorUserId: decision.actorUserId ?? null,
        note: null,
        amountCents: result.approvedAmountCents ?? null,
        source: ClaimEventSource.INSURER_RESPONSE,
        externalReference: decision.externalReference.trim(),
        providerCode: decision.providerCode ?? null,
        decidedAt: decision.decidedAt ?? this.clock.now(),
      },
    );

    if (!updated) {
      // Someone else moved the claim since it was read. The decision is not
      // silently applied on top of a state it was never evaluated against.
      throw new NotFoundException(
        'Insurance claim was modified by another request. Reload and reconcile again.',
      );
    }
  }
}
