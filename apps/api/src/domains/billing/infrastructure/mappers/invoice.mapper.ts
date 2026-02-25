import { Prisma, Invoice as PrismaInvoice } from '@workspace/db';
import { Invoice, InvoiceItem } from '../../core/entities';
import {
  Money,
  InvoiceStatus,
  InvoiceStatusEnum,
  BillingPeriod,
} from '../../core/value-objects';

interface InvoiceItemData {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export class InvoiceMapper {
  static toDomain(raw: PrismaInvoice & { clinicId?: string }): Invoice {
    const itemsData = Array.isArray(raw.items)
      ? (raw.items as unknown as InvoiceItemData[])
      : [];

    const items = itemsData.map(
      (item) =>
        new InvoiceItem({
          id: item.id || '',
          invoiceId: raw.id,
          description: item.description || '',
          quantity: item.quantity || 0,
          unitPrice: new Money(item.unitPrice || 0, 'INR'),
          taxRate: item.taxRate || 0,
          discount: item.discount || 0,
        }),
    );

    const issueDate = new Date(raw.createdAt);
    const dueDate = new Date(raw.createdAt);
    dueDate.setDate(dueDate.getDate() + 30);

    const billingPeriod = new BillingPeriod(issueDate, dueDate);

    const status = new InvoiceStatus(
      raw.status as unknown as InvoiceStatusEnum,
    );

    return new Invoice({
      id: raw.id,
      patientId: raw.patientId,
      clinicId: raw.clinicId,
      appointmentId: raw.appointmentId || undefined,
      status,
      billingPeriod,
      items,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
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

  static toPersistence(invoice: Invoice): Record<string, unknown> {
    const items = invoice.getItems();

    const itemsJson = items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice.amount,
      taxRate: item.taxRate,
      discount: item.discount,
    }));

    const result: Record<string, unknown> = {
      patientId: invoice.patientId,
      appointmentId: invoice.appointmentId || undefined,
      status: invoice.getStatus().value,
      items: itemsJson as Prisma.InputJsonValue,
      total: invoice.getTotal().amount,
      createdAt: invoice.createdAt,
      updatedAt: new Date(),
      version: invoice.version,
      doctorName: invoice.doctorContext?.doctorName,
      doctorEmail: invoice.doctorContext?.doctorEmail,
      doctorPhone: invoice.doctorContext?.doctorPhone,
      doctorSpecialization: invoice.doctorContext?.doctorSpecialization,
      doctorRole: invoice.doctorContext?.doctorRole,
      doctorRegistrationNumber: invoice.doctorContext?.doctorRegistrationNumber,
      doctorLicenseNumber: invoice.doctorContext?.doctorLicenseNumber,
      approvalStatus: invoice.whatsappContext?.approvalStatus,
      approvedById: invoice.whatsappContext?.approvedById,
      approvedAt: invoice.whatsappContext?.approvedAt,
      whatsappSentAt: invoice.whatsappContext?.whatsappSentAt,
      whatsappMessageId: invoice.whatsappContext?.whatsappMessageId,
      whatsappStatus: invoice.whatsappContext?.whatsappStatus,
    };

    return result;
  }

  static getId(invoice: Invoice | PrismaInvoice): string {
    return invoice.id;
  }
}
