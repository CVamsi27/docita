import { Money } from '@/domains/billing/core/value-objects/money.value-object';
import {
  InvoiceStatus,
  InvoiceStatusEnum,
} from '@/domains/billing/core/value-objects/invoice-status.value-object';
import { BillingPeriod } from '@/domains/billing/core/value-objects/billing-period.value-object';
import { InvoiceItem } from './invoice-item.entity';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export interface InvoiceProps {
  id: string;
  patientId: string;
  appointmentId?: string;
  clinicId?: string;
  status: InvoiceStatus;
  billingPeriod: BillingPeriod;
  items: InvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  doctorContext?: {
    doctorName?: string;
    doctorEmail?: string;
    doctorPhone?: string;
    doctorSpecialization?: string;
    doctorRole?: string;
    doctorRegistrationNumber?: string;
    doctorLicenseNumber?: string;
  };
  whatsappContext?: {
    approvalStatus?: string;
    approvedById?: string;
    approvedAt?: Date;
    whatsappSentAt?: Date;
    whatsappMessageId?: string;
    whatsappStatus?: string;
  };
  version?: number;
}

export class Invoice {
  readonly id: string;
  readonly patientId: string;
  readonly appointmentId?: string;
  readonly clinicId?: string;
  private status: InvoiceStatus;
  readonly billingPeriod: BillingPeriod;
  private items: InvoiceItem[];
  readonly createdAt: Date;
  updatedAt: Date;
  private notes?: string;
  readonly doctorContext?: InvoiceProps['doctorContext'];
  readonly whatsappContext?: InvoiceProps['whatsappContext'];
  readonly version: number;

  constructor(props: InvoiceProps) {
    this.id = props.id;
    this.patientId = props.patientId;
    this.appointmentId = props.appointmentId;
    this.clinicId = props.clinicId;
    this.status = props.status;
    this.billingPeriod = props.billingPeriod;
    this.items = props.items;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.notes = props.notes;
    this.doctorContext = props.doctorContext;
    this.whatsappContext = props.whatsappContext;
    this.version = props.version || 1;

    this.validate();
  }

  private touchUpdatedAt(now: Date): void {
    this.updatedAt = now;
  }

  private validate(): void {
    if (this.items.length === 0)
      throw new InvariantViolationError('Invoice must have at least one item');

    if (!this.patientId)
      throw new InvariantViolationError('Invoice must have a patient ID');
  }

  get issueDate(): Date {
    return this.billingPeriod.startDate;
  }

  get dueDate(): Date {
    return this.billingPeriod.endDate;
  }

  getStatus(): InvoiceStatus {
    return this.status;
  }

  getTotal(): Money {
    return this.items
      .map((item) => item.getTotal())
      .reduce((acc, itemTotal) => acc.add(itemTotal));
  }

  getSubtotal(): Money {
    return this.items
      .map((item) => item.getSubtotal())
      .reduce((acc, itemSubtotal) => acc.add(itemSubtotal));
  }

  getTaxAmount(): Money {
    return this.items
      .map((item) => item.getTaxAmount())
      .reduce((acc, itemTax) => acc.add(itemTax));
  }

  addItem(item: InvoiceItem): void {
    if (!this.status.isPending()) {
      throw new InvariantViolationError(
        'Can only add items to pending invoices',
      );
    }
    this.items.push(item);
  }

  removeItem(itemId: string): void {
    if (!this.status.isPending()) {
      throw new InvariantViolationError(
        'Can only remove items from pending invoices',
      );
    }
    this.items = this.items.filter((item) => item.id !== itemId);
    if (this.items.length === 0)
      throw new InvariantViolationError('Invoice must have at least one item');
  }

  markAsPaid(now: Date): void {
    this.status = this.status.transitionTo(InvoiceStatusEnum.PAID);
    this.touchUpdatedAt(now);
  }

  markAsPartiallyPaid(now: Date): void {
    this.status = this.status.transitionTo(InvoiceStatusEnum.PARTIALLY_PAID);
    this.touchUpdatedAt(now);
  }

  markAsOverdue(now: Date): void {
    this.status = this.status.transitionTo(InvoiceStatusEnum.OVERDUE);
    this.touchUpdatedAt(now);
  }

  cancel(now: Date, reason?: string): void {
    this.status = this.status.transitionTo(InvoiceStatusEnum.CANCELLED);
    if (reason) {
      this.notes = `Cancelled: ${reason}`;
    }
    this.touchUpdatedAt(now);
  }

  transitionTo(targetStatus: InvoiceStatusEnum, now: Date): void {
    if (!this.status.canTransitionTo(targetStatus)) {
      throw new InvariantViolationError(
        `Cannot transition from ${this.status.value} to ${targetStatus}`,
      );
    }

    const transitions: Record<InvoiceStatusEnum, () => void> = {
      [InvoiceStatusEnum.PENDING]: () => {
        throw new InvariantViolationError(
          'Use markAsPaid(), markAsPartiallyPaid(), markAsOverdue(), or cancel() from pending',
        );
      },
      [InvoiceStatusEnum.PAID]: () => this.markAsPaid(now),
      [InvoiceStatusEnum.PARTIALLY_PAID]: () => this.markAsPartiallyPaid(now),
      [InvoiceStatusEnum.OVERDUE]: () => this.markAsOverdue(now),
      [InvoiceStatusEnum.CANCELLED]: () => this.cancel(now),
    };

    transitions[targetStatus]();
  }

  isOverdue(now: Date): boolean {
    return now > this.dueDate && !this.status.isPaid();
  }

  canBeEdited(): boolean {
    return this.status.isPending();
  }

  getItems(): InvoiceItem[] {
    return [...this.items];
  }
}
