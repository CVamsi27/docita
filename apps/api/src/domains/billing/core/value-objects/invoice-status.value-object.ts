/**
 * Invoice Status Value Object
 * Ensures only valid state transitions
 */

export enum InvoiceStatusEnum {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  CREDIT_MEMO = 'CREDIT_MEMO',
}

export class InvoiceStatus {
  private static readonly VALID_TRANSITIONS: Record<
    string,
    InvoiceStatusEnum[]
  > = {
    [InvoiceStatusEnum.DRAFT]: [
      InvoiceStatusEnum.ISSUED,
      InvoiceStatusEnum.CANCELLED,
    ],
    [InvoiceStatusEnum.ISSUED]: [
      InvoiceStatusEnum.SENT,
      InvoiceStatusEnum.CANCELLED,
      InvoiceStatusEnum.CREDIT_MEMO,
    ],
    [InvoiceStatusEnum.SENT]: [
      InvoiceStatusEnum.VIEWED,
      InvoiceStatusEnum.PAID,
      InvoiceStatusEnum.PARTIALLY_PAID,
      InvoiceStatusEnum.OVERDUE,
    ],
    [InvoiceStatusEnum.VIEWED]: [
      InvoiceStatusEnum.PAID,
      InvoiceStatusEnum.PARTIALLY_PAID,
      InvoiceStatusEnum.OVERDUE,
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
    [InvoiceStatusEnum.CREDIT_MEMO]: [],
  };

  constructor(readonly value: InvoiceStatusEnum) {}

  canTransitionTo(nextStatus: InvoiceStatusEnum): boolean {
    const allowedTransitions = InvoiceStatus.VALID_TRANSITIONS[this.value];
    return allowedTransitions.includes(nextStatus);
  }

  transitionTo(nextStatus: InvoiceStatusEnum): InvoiceStatus {
    if (!this.canTransitionTo(nextStatus)) {
      throw new Error(`Cannot transition from ${this.value} to ${nextStatus}`);
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

  isDraft(): boolean {
    return this.value === InvoiceStatusEnum.DRAFT;
  }
}
