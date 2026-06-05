import { z } from "zod";
import { type InvoiceStatus, invoiceStatusSchema } from "../shared/users";
import { PaymentMethod } from "./payments";
import { patientSchema } from "../patient/patients";
import { stripHtmlTags } from "../api/sanitization";
import {
  invoiceTaxSummarySchema,
  taxComponentSchema,
  taxInvoiceTypeSchema,
  taxRegistrationSnapshotSchema,
  taxTreatmentSchema,
} from "./tax";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  PARTIALLY_PAID: "Partially Paid",
};

const moneyAmountSchema = z
  .number()
  .finite()
  .min(0)
  .refine((value) => Number.isInteger(Math.round(value * 100)), {
    message: "Amount must be a valid monetary value",
  })
  .refine((value) => Math.round(value * 100) === value * 100, {
    message: "Amount must have at most two decimal places",
  });

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().max(255).transform(stripHtmlTags),
  quantity: z.number().finite().min(1),
  price: moneyAmountSchema,
  unitPrice: moneyAmountSchema.optional(),
  discountRate: z.number().min(0).max(100).optional(),
  discountAmount: moneyAmountSchema.optional(),
  taxTreatment: taxTreatmentSchema.optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxableAmount: moneyAmountSchema.optional(),
  taxAmount: moneyAmountSchema.optional(),
  taxComponents: z.array(taxComponentSchema).optional(),
  lineTotal: moneyAmountSchema.optional(),
  cptCode: z.string().max(20).optional(),
  hsnCode: z.string().max(20).optional(),
  sacCode: z.string().max(20).optional(),
});
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type LineItem = InvoiceItem;

export const invoiceItemsSchema = z.array(invoiceItemSchema);

const invoiceClinicSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  slaSignatureUrl: z.string().nullable().optional(),
});

const invoicePatientSchema = patientSchema.extend({
  clinic: invoiceClinicSchema.optional(),
});

export const invoiceSchema = z.object({
  id: z.string().optional(),
  appointmentId: z.string().optional(),
  patientId: z.string(),
  clinicId: z.string().optional(),
  invoiceNumber: z.string().max(16).optional(),
  invoiceType: taxInvoiceTypeSchema.optional(),
  currency: z.string().length(3).optional(),
  items: z.array(invoiceItemSchema),
  notes: z.string().max(2000).optional().transform(stripHtmlTags),
  total: moneyAmountSchema,
  totalAmount: moneyAmountSchema.optional(),
  subtotal: moneyAmountSchema.optional(),
  discountTotal: moneyAmountSchema.optional(),
  taxTotal: moneyAmountSchema.optional(),
  grandTotal: moneyAmountSchema.optional(),
  taxSummary: invoiceTaxSummarySchema.optional(),
  sellerTaxSnapshot: taxRegistrationSnapshotSchema.optional(),
  buyerTaxSnapshot: taxRegistrationSnapshotSchema.optional(),
  placeOfSupplyStateCode: z.string().max(8).optional(),
  placeOfSupplyStateName: z
    .string()
    .max(120)
    .transform(stripHtmlTags)
    .optional(),
  reverseCharge: z.boolean().optional(),
  issuedAt: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()).optional(),
  eInvoiceRequired: z.boolean().optional(),
  eInvoiceIrn: z.string().max(128).transform(stripHtmlTags).optional(),
  eInvoiceQrCode: z.string().max(4096).transform(stripHtmlTags).optional(),
  eInvoiceAcknowledgedAt: z.string().or(z.date()).optional(),
  status: invoiceStatusSchema,
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paidAt: z.string().or(z.date()).optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).optional(),
  patient: invoicePatientSchema.optional(),
  appointment: z.object({ doctor: z.object({ name: z.string() }) }).optional(),

  doctorName: z.string().optional(),
  doctorEmail: z.string().optional(),
  doctorPhone: z.string().optional(),
  doctorSpecialization: z.string().optional(),
  doctorRole: z.string().optional(),
  doctorRegistrationNumber: z.string().optional(),
  doctorLicenseNumber: z.string().optional(),

  whatsappStatus: z.string().nullable().optional(),
  whatsappSentAt: z.string().or(z.date()).nullable().optional(),
  whatsappMessageId: z.string().nullable().optional(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const createInvoiceSchema = invoiceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  patient: true,
  appointment: true,
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/** Patient summary embedded on GET /invoices list rows (not full {@link patientSchema}). */
export const invoiceListPatientSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phoneNumber: z.string().nullable().optional(),
});

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Coerce persisted/API floats to valid money fields (max two decimal places). */
function roundMoneyAmount(value: unknown): unknown {
  const amount = asFiniteNumber(value);
  if (amount === undefined) {
    return value;
  }
  return Math.round(amount * 100) / 100;
}

function normalizeInvoiceListPatient(
  patient: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!patient) {
    return undefined;
  }
  const firstName =
    typeof patient.firstName === "string" ? patient.firstName.trim() : "";
  const lastName =
    typeof patient.lastName === "string" ? patient.lastName.trim() : "";
  return {
    ...patient,
    firstName: firstName.length > 0 ? firstName : "Patient",
    lastName: lastName.length > 0 ? lastName : "Unknown",
  };
}

function normalizeInvoiceListItems(items: unknown): unknown {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return entry;
    }
    const item = entry as Record<string, unknown>;
    const rawPrice = asFiniteNumber(item.price) ?? asFiniteNumber(item.unitPrice);
    const price =
      rawPrice === undefined ? undefined : roundMoneyAmount(rawPrice);
    const unitPrice =
      item.unitPrice !== undefined
        ? roundMoneyAmount(item.unitPrice)
        : item.unitPrice;
    if (price === undefined) {
      return unitPrice === item.unitPrice ? item : { ...item, unitPrice };
    }
    return {
      ...item,
      price,
      ...(unitPrice !== item.unitPrice ? { unitPrice } : {}),
    };
  });
}

/** Coerce API list payloads before strict {@link invoiceSchema} parsing on the client. */
export function normalizeInvoiceListRowInput(input: unknown): unknown {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }
  const row = input as Record<string, unknown>;
  const patient =
    row.patient &&
    typeof row.patient === "object" &&
    !Array.isArray(row.patient)
      ? (row.patient as Record<string, unknown>)
      : undefined;
  const patientId =
    typeof row.patientId === "string"
      ? row.patientId
      : typeof patient?.id === "string"
        ? patient.id
        : row.patientId;
  const rawTotal =
    asFiniteNumber(row.total) ??
    asFiniteNumber(row.grandTotal) ??
    asFiniteNumber(row.totalAmount);
  const total = rawTotal === undefined ? row.total : roundMoneyAmount(rawTotal);
  const rawTotalAmount = asFiniteNumber(row.totalAmount);
  const totalAmount =
    rawTotalAmount === undefined
      ? total
      : roundMoneyAmount(rawTotalAmount);
  return {
    ...row,
    patientId,
    total,
    totalAmount,
    grandTotal:
      row.grandTotal !== undefined
        ? roundMoneyAmount(row.grandTotal)
        : row.grandTotal,
    patient: normalizeInvoiceListPatient(patient),
    items: normalizeInvoiceListItems(row.items),
  };
}

const listMoney = z.number().finite().nonnegative();

const invoiceListRowBaseSchema = invoiceSchema.omit({ patient: true }).extend({
  patient: invoiceListPatientSchema.nullish().optional(),
  // Coerce null/non-array items to [] and tolerate items that fail schema (not displayed on list)
  items: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(invoiceItemSchema).catch([]),
  ),
  // Relax money-amount refinements — IEEE 754 floats like 10.1 fail the
  // exact-equality check (10.1 * 100 = 1009.999…); server already validated on write.
  total: listMoney,
  totalAmount: listMoney.optional(),
  subtotal: listMoney.optional(),
  discountTotal: listMoney.optional(),
  taxTotal: listMoney.optional(),
  grandTotal: listMoney.optional(),
});

/** Parsed invoice row for clinic-wide and patient-scoped list endpoints. */
export const invoiceListRowSchema = z.preprocess(
  normalizeInvoiceListRowInput,
  invoiceListRowBaseSchema,
);

export type InvoiceListRow = z.infer<typeof invoiceListRowSchema>;

export const paginatedInvoiceListResponseSchema = z.object({
  items: z.array(invoiceListRowSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
  count: z.number().optional(),
});

export type PaginatedInvoiceListResponse = z.infer<
  typeof paginatedInvoiceListResponseSchema
>;
