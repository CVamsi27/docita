import { Money } from '@/domains/billing/core/value-objects/money.value-object';
import {
  InvoiceStatus,
  InvoiceStatusEnum,
} from '@/domains/billing/core/value-objects/invoice-status.value-object';
import { BillingPeriod } from '@/domains/billing/core/value-objects/billing-period.value-object';
import { InvoiceItem } from './invoice-item.entity';

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

  private validate(): void {
    if (this.items.length === 0) {
      throw new Error('Invoice must have at least one item');
    }

    if (!this.patientId) {
      throw new Error('Invoice must have a patient ID');
    }
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
    if (!this.status.isDraft()) {
      throw new Error('Can only add items to draft invoices');
    }
    this.items.push(item);
  }

  removeItem(itemId: string): void {
    if (!this.status.isDraft()) {
      throw new Error('Can only remove items from draft invoices');
    }
    this.items = this.items.filter((item) => item.id !== itemId);
    if (this.items.length === 0) {
      throw new Error('Invoice must have at least one item');
    }
  }

  issue(): void {
    this.status = this.status.transitionTo(InvoiceStatusEnum.ISSUED);
    this.updatedAt = new Date();
  }

  send(): void {
    this.status = this.status.transitionTo(InvoiceStatusEnum.SENT);
    this.updatedAt = new Date();
  }

  markAsViewed(): void {
    this.status = this.status.transitionTo(InvoiceStatusEnum.VIEWED);
    this.updatedAt = new Date();
  }

  markAsPaid(): void {
    this.status = this.status.transitionTo(InvoiceStatusEnum.PAID);
    this.updatedAt = new Date();
  }

  markAsPartiallyPaid(): void {
    this.status = this.status.transitionTo(InvoiceStatusEnum.PARTIALLY_PAID);
    this.updatedAt = new Date();
  }

  markAsOverdue(): void {
    this.status = this.status.transitionTo(InvoiceStatusEnum.OVERDUE);
    this.updatedAt = new Date();
  }

  cancel(reason?: string): void {
    this.status = this.status.transitionTo(InvoiceStatusEnum.CANCELLED);
    if (reason) {
      this.notes = `Cancelled: ${reason}`;
    }
    this.updatedAt = new Date();
  }

  convertToCredit(): void {
    this.status = this.status.transitionTo(InvoiceStatusEnum.CREDIT_MEMO);
    this.updatedAt = new Date();
  }

  isOverdue(): boolean {
    return new Date() > this.dueDate && !this.status.isPaid();
  }

  canBeEdited(): boolean {
    return this.status.isDraft();
  }

  getItems(): InvoiceItem[] {
    return [...this.items];
  }
}
