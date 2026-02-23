/**
 * Invoice Mapper
 * Converts between Prisma models and domain entities
 * Separates database concerns from business logic
 */

import { Invoice, InvoiceItem } from '../../core/entities';
import { Money, InvoiceStatus, InvoiceStatusEnum, BillingPeriod } from '../../core/value-objects';

// Assuming these Prisma types (from @workspace/db)
interface PrismaInvoice {
  id: string;
  clinicId: string;
  patientId: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  issueDate: Date;
  dueDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  items: PrismaInvoiceItem[];
}

interface PrismaInvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export class InvoiceMapper {
  /**
   * Convert Prisma model to domain entity
   */
  static toDomain(raw: PrismaInvoice): Invoice {
    const items = raw.items.map((item) =>
      new InvoiceItem({
        id: item.id,
        invoiceId: item.invoiceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: new Money(item.unitPrice, 'INR'),
        taxRate: item.taxRate,
        discount: item.discount,
      }),
    );

    const billingPeriod = new BillingPeriod(raw.issueDate, raw.dueDate);
    const status = new InvoiceStatus(raw.status as InvoiceStatusEnum);

    return new Invoice({
      id: raw.id,
      clinicId: raw.clinicId,
      patientId: raw.patientId,
      status,
      billingPeriod,
      items,
      issueDate: raw.issueDate,
      dueDate: raw.dueDate,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      notes: raw.notes,
    });
  }

  /**
   * Convert domain entity to Prisma persistence format
   */
  static toPersistence(invoice: Invoice): Omit<PrismaInvoice, 'items'> & { items: PrismaInvoiceItem[] } {
    const items = invoice.getItems();
    
    return {
      id: invoice.id,
      clinicId: invoice.clinicId,
      patientId: invoice.patientId,
      status: invoice.getStatus().value,
      subtotal: invoice.getSubtotal().amount,
      taxAmount: invoice.getTaxAmount().amount,
      discountAmount: items.reduce((sum, item) => sum + item.getDiscountAmount().amount, 0),
      total: invoice.getTotal().amount,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      items: items.map((item) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice.amount,
        taxRate: item.taxRate,
        discount: item.discount,
      })),
    };
  }

  /**
   * Extract domain ID (used for repository patterns)
   */
  static getId(invoice: Invoice | PrismaInvoice): string {
    return invoice.id;
  }
}
