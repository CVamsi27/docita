/**
 * Invoice Entity - Core business aggregate
 * Represents a single invoice with line items
 */

import { Money } from '../value-objects/money.value-object';
import { InvoiceStatus, InvoiceStatusEnum } from '../value-objects/invoice-status.value-object';
import { BillingPeriod } from '../value-objects/billing-period.value-object';
import { InvoiceItem } from './invoice-item.entity';

export interface InvoiceProps {
  id: string;
  clinicId: string;
  patientId: string;
  status: InvoiceStatus;
  billingPeriod: BillingPeriod;
  items: InvoiceItem[];
  issueDate: Date;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export class Invoice {
  readonly id: string;
  readonly clinicId: string;
  readonly patientId: string;
  private status: InvoiceStatus;
  readonly billingPeriod: BillingPeriod;
  private items: InvoiceItem[];
  readonly issueDate: Date;
  readonly dueDate: Date;
  readonly createdAt: Date;
  updatedAt: Date;
  notes?: string;

  constructor(props: InvoiceProps) {
    this.id = props.id;
    this.clinicId = props.clinicId;
    this.patientId = props.patientId;
    this.status = props.status;
    this.billingPeriod = props.billingPeriod;
    this.items = props.items;
    this.issueDate = props.issueDate;
    this.dueDate = props.dueDate;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.notes = props.notes;

    this.validate();
  }

  private validate(): void {
    if (this.items.length === 0) {
      throw new Error('Invoice must have at least one item');
    }

    if (this.issueDate > this.dueDate) {
      throw new Error('Issue date must be before due date');
    }
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
