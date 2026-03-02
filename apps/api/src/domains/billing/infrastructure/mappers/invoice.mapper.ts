import {
  Prisma,
  Invoice as PrismaInvoice,
  InvoiceStatus as PrismaInvoiceStatus,
} from '@workspace/db';
import { Invoice, InvoiceItem } from '@/domains/billing/core/entities';
import {
  Money,
  InvoiceStatus,
  InvoiceStatusEnum,
  BillingPeriod,
} from '@/domains/billing/core/value-objects';

interface InvoiceItemData {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

const PRISMA_TO_DOMAIN_STATUS: Record<PrismaInvoiceStatus, InvoiceStatusEnum> =
  {
    PENDING: InvoiceStatusEnum.ISSUED,
    PAID: InvoiceStatusEnum.PAID,
    PARTIALLY_PAID: InvoiceStatusEnum.PARTIALLY_PAID,
    OVERDUE: InvoiceStatusEnum.OVERDUE,
    CANCELLED: InvoiceStatusEnum.CANCELLED,
  };

const parseInvoiceItems = (items: unknown): InvoiceItemData[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => {
      const record = Object.fromEntries(Object.entries(item));
      const quantity =
        typeof record.quantity === 'number' && Number.isFinite(record.quantity)
          ? record.quantity
          : 0;
      const unitPrice =
        typeof record.unitPrice === 'number' &&
        Number.isFinite(record.unitPrice)
          ? record.unitPrice
          : typeof record.price === 'number' && Number.isFinite(record.price)
            ? record.price
            : 0;
      const taxRate =
        typeof record.taxRate === 'number' && Number.isFinite(record.taxRate)
          ? record.taxRate
          : 0;
      const discount =
        typeof record.discount === 'number' && Number.isFinite(record.discount)
          ? record.discount
          : 0;

      return {
        id: typeof record.id === 'string' ? record.id : '',
        description:
          typeof record.description === 'string' ? record.description : '',
        quantity,
        unitPrice,
        taxRate,
        discount,
      };
    });
};

export class InvoiceMapper {
  static toDomain(raw: PrismaInvoice & { clinicId?: string }): Invoice {
    const itemsData = parseInvoiceItems(raw.items);

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

    const status = new InvoiceStatus(PRISMA_TO_DOMAIN_STATUS[raw.status]);

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
