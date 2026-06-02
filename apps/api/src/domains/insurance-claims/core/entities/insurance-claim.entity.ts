import { ClaimStatus, ClaimType } from '@workspace/db';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';
import {
  ClaimStatusEnum,
  ClaimStatusVO,
} from '../value-objects/claim-status.value-object';

export interface ClaimTransitionResult {
  status: ClaimStatus;
  submittedAt?: Date;
  respondedAt?: Date;
  settledAt?: Date;
  approvedAmountCents?: number;
  patientResponsibilityCents?: number;
  denialReason?: string;
}

export interface InsuranceClaimProps {
  id: string;
  claimType: ClaimType;
  status: ClaimStatus;
  claimedAmountCents: number;
  approvedAmountCents: number | null;
  patientResponsibilityCents: number | null;
  submittedAt: Date | null;
  respondedAt: Date | null;
  settledAt: Date | null;
}

/**
 * Domain entity wrapping a claim's lifecycle. Validation that depends on the
 * current state (legal transitions, the amount/timestamp side effects of each
 * move) lives here so it is unit-testable without Prisma.
 */
export class InsuranceClaim {
  private statusVo: ClaimStatusVO;

  constructor(private readonly props: InsuranceClaimProps) {
    if (props.claimedAmountCents < 0) {
      throw new InvariantViolationError('Claimed amount cannot be negative');
    }
    this.statusVo = new ClaimStatusVO(props.status);
  }

  get id(): string {
    return this.props.id;
  }

  get status(): ClaimStatus {
    return this.statusVo.value;
  }

  /**
   * Computes the persisted side effects of moving to `target`. Validates the
   * transition and that any approved/responsibility amounts are coherent with
   * the claimed amount.
   */
  transitionTo(
    target: ClaimStatus,
    opts: {
      now: Date;
      approvedAmountCents?: number;
      patientResponsibilityCents?: number;
      denialReason?: string;
    },
  ): ClaimTransitionResult {
    this.statusVo = this.statusVo.transitionTo(target);
    const result: ClaimTransitionResult = { status: target };

    switch (target) {
      case ClaimStatusEnum.SUBMITTED:
        if (!this.props.submittedAt) result.submittedAt = opts.now;
        break;
      case ClaimStatusEnum.APPROVED:
      case ClaimStatusEnum.PARTIALLY_APPROVED: {
        const approved =
          opts.approvedAmountCents ??
          (target === ClaimStatusEnum.APPROVED
            ? this.props.claimedAmountCents
            : undefined);
        if (approved === undefined) {
          throw new InvariantViolationError(
            'approvedAmountCents is required when partially approving a claim',
          );
        }
        if (approved < 0 || approved > this.props.claimedAmountCents) {
          throw new InvariantViolationError(
            'Approved amount must be between 0 and the claimed amount',
          );
        }
        if (
          target === ClaimStatusEnum.APPROVED &&
          approved !== this.props.claimedAmountCents
        ) {
          throw new InvariantViolationError(
            'Approved claims must approve the full claimed amount',
          );
        }
        if (
          target === ClaimStatusEnum.PARTIALLY_APPROVED &&
          (approved === 0 || approved === this.props.claimedAmountCents)
        ) {
          throw new InvariantViolationError(
            'Partially approved claims must approve more than zero and less than the claimed amount',
          );
        }
        const patientResponsibility =
          opts.patientResponsibilityCents ??
          this.props.claimedAmountCents - approved;
        if (
          patientResponsibility < 0 ||
          approved + patientResponsibility !== this.props.claimedAmountCents
        ) {
          throw new InvariantViolationError(
            'Approved amount and patient responsibility must equal the claimed amount',
          );
        }
        result.respondedAt = opts.now;
        result.approvedAmountCents = approved;
        result.patientResponsibilityCents = patientResponsibility;
        break;
      }
      case ClaimStatusEnum.DENIED:
        if (!opts.denialReason?.trim()) {
          throw new InvariantViolationError(
            'A denial reason is required when denying a claim',
          );
        }
        result.respondedAt = opts.now;
        result.approvedAmountCents = 0;
        result.patientResponsibilityCents = this.props.claimedAmountCents;
        result.denialReason = opts.denialReason;
        break;
      case ClaimStatusEnum.SETTLED:
        result.settledAt = opts.now;
        break;
      default:
        break;
    }

    return result;
  }
}
