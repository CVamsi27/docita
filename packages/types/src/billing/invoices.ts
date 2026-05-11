import { z } from "zod";
import { invoiceStatusSchema } from "../shared/users";
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

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().max(255).transform(stripHtmlTags),
  quantity: z.number().min(1),
  price: z.number().min(0),
  unitPrice: z.number().min(0).optional(),
  discountRate: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  taxTreatment: taxTreatmentSchema.optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxableAmount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  taxComponents: z.array(taxComponentSchema).optional(),
  lineTotal: z.number().min(0).optional(),
  cptCode: z.string().max(20).optional(),
  hsnCode: z.string().max(20).optional(),
  sacCode: z.string().max(20).optional(),
});
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type LineItem = InvoiceItem;

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
  total: z.number().min(0),
  totalAmount: z.number().min(0).optional(),
  subtotal: z.number().min(0).optional(),
  discountTotal: z.number().min(0).optional(),
  taxTotal: z.number().min(0).optional(),
  grandTotal: z.number().min(0).optional(),
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
