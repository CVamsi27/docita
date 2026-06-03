import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export enum InvoiceStatusEnum {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export class InvoiceStatus {
  private static readonly VALID_TRANSITIONS: Record<
    string,
    InvoiceStatusEnum[]
  > = {
    [InvoiceStatusEnum.PENDING]: [
      InvoiceStatusEnum.PAID,
      InvoiceStatusEnum.PARTIALLY_PAID,
      InvoiceStatusEnum.OVERDUE,
      InvoiceStatusEnum.CANCELLED,
    ],
    [InvoiceStatusEnum.PARTIALLY_PAID]: [
      InvoiceStatusEnum.PAID,
      InvoiceStatusEnum.OVERDUE,
    ],
    [InvoiceStatusEnum.PAID]: [],
    [InvoiceStatusEnum.OVERDUE]: [
      InvoiceStatusEnum.PAID,
      InvoiceStatusEnum.PARTIALLY_PAID,
    ],
    [InvoiceStatusEnum.CANCELLED]: [],
  };

  constructor(readonly value: InvoiceStatusEnum) {}

  canTransitionTo(nextStatus: InvoiceStatusEnum): boolean {
    const allowedTransitions = InvoiceStatus.VALID_TRANSITIONS[this.value];
    return allowedTransitions.includes(nextStatus);
  }

  transitionTo(nextStatus: InvoiceStatusEnum): InvoiceStatus {
    if (!this.canTransitionTo(nextStatus)) {
      throw new InvariantViolationError(
        `Cannot transition from ${this.value} to ${nextStatus}`,
      );
    }
    return new InvoiceStatus(nextStatus);
  }

  equals(other: InvoiceStatus): boolean {
    return this.value === other.value;
  }

  isPaid(): boolean {
    return this.value === InvoiceStatusEnum.PAID;
  }

  isOverdue(): boolean {
    return this.value === InvoiceStatusEnum.OVERDUE;
  }

  isCancelled(): boolean {
    return this.value === InvoiceStatusEnum.CANCELLED;
  }

  isPending(): boolean {
    return this.value === InvoiceStatusEnum.PENDING;
  }
}
