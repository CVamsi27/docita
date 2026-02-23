/**
 * Invoice Mapper
 * Converts between Prisma models and domain entities
 * Separates database concerns from business logic
 *
 * Handles Prisma Invoice schema where:
 * - items are stored as JSON (not a separate table)
 * - total is a single Float (all-in)
 * - status is InvoiceStatus enum
 * - includes WhatsApp sharing and doctor context fields
 */

import { Prisma, Invoice as PrismaInvoice } from '@workspace/db';
import { Invoice, InvoiceItem } from '../../core/entities';
import {
  Money,
  InvoiceStatus,
  InvoiceStatusEnum,
  BillingPeriod,
} from '../../core/value-objects';

/**
 * Domain representation of a JSON invoice item
 * Matches the Prisma Invoice.items JSON structure
 */
interface InvoiceItemData {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export class InvoiceMapper {
  /**
   * Convert Prisma model to domain entity
   *
   * The Prisma Invoice stores items as JSON.
   * This method reconstructs the domain InvoiceItem entities from that JSON.
   */
  static toDomain(raw: PrismaInvoice): Invoice {
    // Parse items from JSON (Prisma stores as JSON or object depending on adapter)
    const itemsData = Array.isArray(raw.items)
      ? (raw.items as unknown as InvoiceItemData[])
      : [];

    const items = itemsData.map(
      (item) =>
        new InvoiceItem({
          id: (item as any).id || '',
          invoiceId: raw.id,
          description: (item as any).description || '',
          quantity: (item as any).quantity || 0,
          unitPrice: new Money((item as any).unitPrice || 0, 'INR'),
          taxRate: (item as any).taxRate || 0,
          discount: (item as any).discount || 0,
        }),
    );

    // Create a billing period with createdAt as issue date
    // and add 30 days for due date (or use updatedAt if available)
    const issueDate = new Date(raw.createdAt);
    const dueDate = new Date(raw.createdAt);
    dueDate.setDate(dueDate.getDate() + 30);

    const billingPeriod = new BillingPeriod(issueDate, dueDate);

    // Map the status - Prisma stores it as InvoiceStatus enum
    const statusValue = raw.status as any;
    const status = new InvoiceStatus(statusValue);

    return new Invoice({
      id: raw.id,
      patientId: raw.patientId,
      appointmentId: raw.appointmentId || undefined,
      status,
      billingPeriod,
      items,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      // Store additional fields as domain context
      doctorContext: {
        doctorName: raw.doctorName || undefined,
        doctorEmail: raw.doctorEmail || undefined,
        doctorPhone: raw.doctorPhone || undefined,
        doctorSpecialization: raw.doctorSpecialization || undefined,
        doctorRole: raw.doctorRole || undefined,
        doctorRegistrationNumber: raw.doctorRegistrationNumber || undefined,
        doctorLicenseNumber: raw.doctorLicenseNumber || undefined,
      },
      whatsappContext: {
        approvalStatus: raw.approvalStatus || undefined,
        approvedById: raw.approvedById || undefined,
        approvedAt: raw.approvedAt || undefined,
        whatsappSentAt: raw.whatsappSentAt || undefined,
        whatsappMessageId: raw.whatsappMessageId || undefined,
        whatsappStatus: raw.whatsappStatus || undefined,
      },
      version: raw.version,
    });
  }

  /**
   * Convert domain entity to Prisma persistence format
   *
   * Converts domain items list back to JSON for Prisma storage.
   * Maintains the total as single float (already calculated by domain entity).
   */
  static toPersistence(invoice: Invoice): any {
    const items = invoice.getItems();
    
    // Convert domain items to JSON format for storage
    const itemsJson = items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice.amount,
      taxRate: item.taxRate,
      discount: item.discount,
    }));

    // Note: Using `any` here because Prisma's strict types make it difficult
    // to construct valid InvoiceCreateInput/InvoiceUpdateInput objects dynamically
    // The runtime will validate these against the schema
    const result: any = {
      patientId: invoice.patientId,
      appointmentId: invoice.appointmentId || undefined,
      status: invoice.getStatus().value,
      items: itemsJson,
      total: invoice.getTotal().amount,
      createdAt: invoice.createdAt,
      updatedAt: new Date(),
      version: invoice.version,
      // Doctor context
      doctorName: (invoice as any).doctorContext?.doctorName,
      doctorEmail: (invoice as any).doctorContext?.doctorEmail,
      doctorPhone: (invoice as any).doctorContext?.doctorPhone,
      doctorSpecialization:
        (invoice as any).doctorContext?.doctorSpecialization,
      doctorRole: (invoice as any).doctorContext?.doctorRole,
      doctorRegistrationNumber:
        (invoice as any).doctorContext?.doctorRegistrationNumber,
      doctorLicenseNumber:
        (invoice as any).doctorContext?.doctorLicenseNumber,
      // WhatsApp context
      approvalStatus: (invoice as any).whatsappContext?.approvalStatus,
      approvedById: (invoice as any).whatsappContext?.approvedById,
      approvedAt: (invoice as any).whatsappContext?.approvedAt,
      whatsappSentAt: (invoice as any).whatsappContext?.whatsappSentAt,
      whatsappMessageId: (invoice as any).whatsappContext?.whatsappMessageId,
      whatsappStatus: (invoice as any).whatsappContext?.whatsappStatus,
    };

    return result;
  }

  /**
   * Extract domain ID (used for repository patterns)
   */
  static getId(invoice: Invoice | PrismaInvoice): string {
    return invoice.id;
  }
}
