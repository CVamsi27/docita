import { Injectable, BadRequestException } from '@nestjs/common';
import { Invoice, InvoiceStatus, ApprovalStatus } from '@workspace/db';

/**
 * Invoice Factory
 * Encapsulates creation logic for Invoice entities
 * Ensures all invoices meet financial and business rule constraints
 */
@Injectable()
export class InvoiceFactory {
  // Default tax rate (18% GST for India)
  private readonly DEFAULT_TAX_RATE = 0.18;

  /**
   * Create invoice builder for fluent interface
   */
  builder(): InvoiceBuilder {
    return new InvoiceBuilder(this.DEFAULT_TAX_RATE);
  }

  /**
   * Validate invoice data before persisting
   */
  validateInvoice(data: Partial<Invoice>): void {
    if (!data.patientId) {
      throw new BadRequestException('Patient ID is required');
    }

    if (!data.clinicId) {
      throw new BadRequestException('Clinic ID is required');
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one line item is required');
    }

    // Validate each line item
    if (Array.isArray(data.items)) {
      data.items.forEach((item: any, index: number) => {
        if (!item.quantity || item.quantity <= 0) {
          throw new BadRequestException(`Item ${index + 1}: quantity must be positive`);
        }

        if (!item.unitPrice || item.unitPrice < 0) {
          throw new BadRequestException(`Item ${index + 1}: valid unit price is required`);
        }

        if (item.taxRate !== undefined && (item.taxRate < 0 || item.taxRate > 1)) {
          throw new BadRequestException(`Item ${index + 1}: tax rate must be between 0 and 1`);
        }

        if (item.discountValue !== undefined && item.discountValue < 0) {
          throw new BadRequestException(`Item ${index + 1}: discount cannot be negative`);
        }
      });
    }

    // Validate amount fields
    if (data.subtotal !== undefined && data.subtotal < 0) {
      throw new BadRequestException('Subtotal cannot be negative');
    }

    if (data.tax !== undefined && data.tax < 0) {
      throw new BadRequestException('Tax amount cannot be negative');
    }

    if (data.total !== undefined && data.total < 0) {
      throw new BadRequestException('Total amount cannot be negative');
    }

    // Validate discount if provided
    if (data.discount !== undefined && data.discount < 0) {
      throw new BadRequestException('Discount cannot be negative');
    }

    // Validate status if provided
    if (data.status) {
      const validStatuses = Object.values(InvoiceStatus);
      if (!validStatuses.includes(data.status)) {
        throw new BadRequestException(`Invalid invoice status: ${data.status}`);
      }
    }

    // Validate due date
    if (data.dueDate && data.dueDate < new Date()) {
      throw new BadRequestException('Due date cannot be in the past');
    }

    // Validate notes length
    if (data.notes && data.notes.length > 1000) {
      throw new BadRequestException('Invoice notes cannot exceed 1000 characters');
    }
  }
}

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountType?: 'FIXED' | 'PERCENTAGE';
  discountValue?: number;
}

/**
 * Fluent builder for creating Invoice entities
 */
export class InvoiceBuilder {
  private data: Partial<Invoice> = {
    status: InvoiceStatus.DRAFT,
    approvalStatus: ApprovalStatus.PENDING,
    items: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
  };

  constructor(private defaultTaxRate: number) {}

  withPatientId(patientId: string): InvoiceBuilder {
    this.data.patientId = patientId;
    return this;
  }

  withClinicId(clinicId: string): InvoiceBuilder {
    this.data.clinicId = clinicId;
    return this;
  }

  withConsultationId(consultationId?: string): InvoiceBuilder {
    this.data.consultationId = consultationId;
    return this;
  }

  addLineItem(item: InvoiceLineItem): InvoiceBuilder {
    if (!this.data.items) {
      this.data.items = [];
    }
    this.data.items.push({
      ...item,
      taxRate: item.taxRate ?? this.defaultTaxRate,
    } as any);
    return this;
  }

  withLineItems(items: InvoiceLineItem[]): InvoiceBuilder {
    this.data.items = items.map(item => ({
      ...item,
      taxRate: item.taxRate ?? this.defaultTaxRate,
    })) as any;
    return this;
  }

  withSubtotal(subtotal: number): InvoiceBuilder {
    this.data.subtotal = subtotal;
    return this;
  }

  withTax(tax: number): InvoiceBuilder {
    this.data.tax = tax;
    return this;
  }

  withDiscount(discount: number): InvoiceBuilder {
    this.data.discount = discount;
    return this;
  }

  withTotal(total: number): InvoiceBuilder {
    this.data.total = total;
    return this;
  }

  withStatus(status: InvoiceStatus): InvoiceBuilder {
    this.data.status = status;
    return this;
  }

  withApprovalStatus(status: ApprovalStatus): InvoiceBuilder {
    this.data.approvalStatus = status;
    return this;
  }

  withDueDate(dueDate: Date | string): InvoiceBuilder {
    this.data.dueDate = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return this;
  }

  withNotes(notes: string): InvoiceBuilder {
    this.data.notes = notes;
    return this;
  }

  withPaymentTermsDays(days: number): InvoiceBuilder {
    this.data.paymentTermsDays = days;
    return this;
  }

  withAmountPaid(amount: number): InvoiceBuilder {
    this.data.amountPaid = amount;
    return this;
  }

  build(): Partial<Invoice> {
    return this.data;
  }
}
