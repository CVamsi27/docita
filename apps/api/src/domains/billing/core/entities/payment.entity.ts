import { Money } from '@/domains/billing/core/value-objects/money.value-object';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export enum PaymentStatus {
  PENDING = 'PENDING',
  CAPTURED = 'CAPTURED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  UPI = 'UPI',
  NET_BANKING = 'NET_BANKING',
  WALLET = 'WALLET',
  CASH = 'CASH',
}

export interface PaymentProps {
  id: string;
  invoiceId: string;
  amount: Money;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId: string;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  refundedAmount?: Money;
  failureReason?: string;
}

export class Payment {
  readonly id: string;
  readonly invoiceId: string;
  readonly amount: Money;
  private status: PaymentStatus;
  readonly method: PaymentMethod;
  readonly transactionId: string;
  readonly processedAt: Date;
  readonly createdAt: Date;
  updatedAt: Date;
  private refundedAmount: Money;
  failureReason?: string;

  constructor(props: PaymentProps) {
    this.id = props.id;
    this.invoiceId = props.invoiceId;
    this.amount = props.amount;
    this.status = props.status;
    this.method = props.method;
    this.transactionId = props.transactionId;
    this.processedAt = props.processedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.refundedAmount =
      props.refundedAmount ?? new Money(0, props.amount.currency);
    this.failureReason = props.failureReason;
  }

  getStatus(): PaymentStatus {
    return this.status;
  }

  private touchUpdatedAt(now: Date): void {
    this.updatedAt = now;
  }

  capture(now: Date): void {
    if (this.status !== PaymentStatus.PENDING)
      throw new InvariantViolationError('Can only capture pending payments');
    this.status = PaymentStatus.CAPTURED;
    this.touchUpdatedAt(now);
  }

  refund(amount: Money, now: Date): void {
    if (this.status !== PaymentStatus.CAPTURED)
      throw new InvariantViolationError('Can only refund captured payments');

    const totalRefunded = this.refundedAmount.add(amount);
    if (totalRefunded.isGreaterThan(this.amount)) {
      throw new InvariantViolationError(
        'Refund amount cannot exceed payment amount',
      );
    }

    this.refundedAmount = totalRefunded;
    this.touchUpdatedAt(now);

    if (this.refundedAmount.amount >= this.amount.amount * 0.9999) {
      this.status = PaymentStatus.REFUNDED;
    }
  }

  fail(reason: string, now: Date): void {
    if (this.status === PaymentStatus.CAPTURED)
      throw new InvariantViolationError('Cannot fail a captured payment');
    this.status = PaymentStatus.FAILED;
    this.failureReason = reason;
    this.touchUpdatedAt(now);
  }

  getRefundedAmount(): Money {
    return this.refundedAmount;
  }

  isPending(): boolean {
    return this.status === PaymentStatus.PENDING;
  }

  isCaptured(): boolean {
    return this.status === PaymentStatus.CAPTURED;
  }

  isRefunded(): boolean {
    return this.status === PaymentStatus.REFUNDED;
  }

  isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }
}
