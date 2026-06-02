import { InvariantViolationError } from '@/shared/common/errors/domain.errors';
import { ClaimStatus as ClaimStatusEnum } from '@workspace/db';

export { ClaimStatusEnum };

/**
 * State machine for an insurance claim. Mirrors the invoice status value
 * object: transitions are explicit and any disallowed move throws an
 * {@link InvariantViolationError} so the command layer surfaces a 4xx.
 */
export class ClaimStatusVO {
  private static readonly VALID_TRANSITIONS: Record<
    ClaimStatusEnum,
    ClaimStatusEnum[]
  > = {
    [ClaimStatusEnum.DRAFT]: [
      ClaimStatusEnum.SUBMITTED,
      ClaimStatusEnum.CANCELLED,
    ],
    [ClaimStatusEnum.SUBMITTED]: [
      ClaimStatusEnum.INFO_REQUESTED,
      ClaimStatusEnum.APPROVED,
      ClaimStatusEnum.PARTIALLY_APPROVED,
      ClaimStatusEnum.DENIED,
      ClaimStatusEnum.CANCELLED,
    ],
    [ClaimStatusEnum.INFO_REQUESTED]: [
      ClaimStatusEnum.SUBMITTED,
      ClaimStatusEnum.APPROVED,
      ClaimStatusEnum.PARTIALLY_APPROVED,
      ClaimStatusEnum.DENIED,
      ClaimStatusEnum.CANCELLED,
    ],
    [ClaimStatusEnum.APPROVED]: [
      ClaimStatusEnum.SETTLED,
      ClaimStatusEnum.APPEALED,
      ClaimStatusEnum.CANCELLED,
    ],
    [ClaimStatusEnum.PARTIALLY_APPROVED]: [
      ClaimStatusEnum.SETTLED,
      ClaimStatusEnum.APPEALED,
      ClaimStatusEnum.CANCELLED,
    ],
    [ClaimStatusEnum.DENIED]: [
      ClaimStatusEnum.APPEALED,
      ClaimStatusEnum.CANCELLED,
    ],
    [ClaimStatusEnum.APPEALED]: [
      ClaimStatusEnum.SUBMITTED,
      ClaimStatusEnum.APPROVED,
      ClaimStatusEnum.PARTIALLY_APPROVED,
      ClaimStatusEnum.DENIED,
      ClaimStatusEnum.CANCELLED,
    ],
    [ClaimStatusEnum.SETTLED]: [],
    [ClaimStatusEnum.CANCELLED]: [],
  };

  constructor(readonly value: ClaimStatusEnum) {}

  canTransitionTo(next: ClaimStatusEnum): boolean {
    return ClaimStatusVO.VALID_TRANSITIONS[this.value].includes(next);
  }

  transitionTo(next: ClaimStatusEnum): ClaimStatusVO {
    if (!this.canTransitionTo(next)) {
      throw new InvariantViolationError(
        `Cannot transition claim from ${this.value} to ${next}`,
      );
    }
    return new ClaimStatusVO(next);
  }

  isTerminal(): boolean {
    return ClaimStatusVO.VALID_TRANSITIONS[this.value].length === 0;
  }
}
