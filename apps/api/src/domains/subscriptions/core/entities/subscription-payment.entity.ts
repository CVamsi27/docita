import { formatCurrency } from '@workspace/utils';

export enum PaymentStatusEnum {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface SubscriptionPaymentProps {
  id: string;
  subscriptionId: string;
  clinicId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatusEnum;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  invoiceUrl?: string;
  isProrated?: boolean;
  proratedDays?: number;
  creditsApplied?: number;
  failureReason?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class SubscriptionPayment {
  readonly id: string;
  readonly subscriptionId: string;
  readonly clinicId: string;
  readonly amountCents: number;
  readonly currency: string;
  private status: PaymentStatusEnum;
  readonly razorpayPaymentId?: string;
  readonly razorpayOrderId?: string;
  readonly invoiceUrl?: string;
  readonly isProrated: boolean;
  readonly proratedDays?: number;
  readonly creditsApplied: number;
  failureReason?: string;
  paidAt?: Date;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: SubscriptionPaymentProps) {
    this.id = props.id;
    this.subscriptionId = props.subscriptionId;
    this.clinicId = props.clinicId;
    this.amountCents = props.amountCents;
    this.currency = props.currency;
    this.status = props.status;
    this.razorpayPaymentId = props.razorpayPaymentId;
    this.razorpayOrderId = props.razorpayOrderId;
    this.invoiceUrl = props.invoiceUrl;
    this.isProrated = props.isProrated || false;
    this.proratedDays = props.proratedDays;
    this.creditsApplied = props.creditsApplied || 0;
    this.failureReason = props.failureReason;
    this.paidAt = props.paidAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;

    this.validate();
  }

  private validate(): void {
    if (this.amountCents < 0) {
      throw new Error('Payment amount cannot be negative');
    }
    if (this.creditsApplied < 0) {
      throw new Error('Credits applied cannot be negative');
    }
  }

  getStatus(): PaymentStatusEnum {
    return this.status;
  }

  isPending(): boolean {
    return this.status === PaymentStatusEnum.PENDING;
  }

  isPaid(): boolean {
    return this.status === PaymentStatusEnum.PAID;
  }

  isFailed(): boolean {
    return this.status === PaymentStatusEnum.FAILED;
  }

  isRefunded(): boolean {
    return this.status === PaymentStatusEnum.REFUNDED;
  }

  markAsPaid(paidAt: Date, now: Date): void {
    if (!this.isPending()) {
      throw new Error(`Cannot mark ${this.status} payment as paid`);
    }
    this.status = PaymentStatusEnum.PAID;
    this.paidAt = paidAt;
    this.updatedAt = now;
  }

  markAsFailed(reason: string, now: Date): void {
    if (this.isPaid() || this.isRefunded()) {
      throw new Error(
        `Cannot mark completed payment (${this.status}) as failed`,
      );
    }
    this.status = PaymentStatusEnum.FAILED;
    this.failureReason = reason;
    this.updatedAt = now;
  }

  refund(now: Date): void {
    if (!this.isPaid()) {
      throw new Error('Can only refund paid payments');
    }
    this.status = PaymentStatusEnum.REFUNDED;
    this.updatedAt = now;
  }

  getNetAmount(): number {
    return Math.max(0, this.amountCents - this.creditsApplied);
  }

  getDisplayAmount(): string {
    return formatCurrency(this.amountCents / 100, {
      currency: this.currency,
      fractionDigits: 2,
    });
  }
}
