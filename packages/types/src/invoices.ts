import { z } from "zod";
import { invoiceStatusSchema } from "./users";
import { PaymentMethod } from "./payments";
import { patientSchema } from "./patients";
import { stripHtmlTags } from "./sanitization";

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().max(255).transform(stripHtmlTags),
  quantity: z.number().min(1),
  price: z.number().min(0),
});
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type LineItem = InvoiceItem;

export const invoiceSchema = z.object({
  id: z.string().optional(),
  appointmentId: z.string().optional(),
  patientId: z.string(),
  clinicId: z.string().optional(),
  items: z.array(invoiceItemSchema),
  notes: z.string().max(2000).optional().transform(stripHtmlTags),
  total: z.number().min(0),
  totalAmount: z.number().min(0).optional(),
  status: invoiceStatusSchema,
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paidAt: z.string().or(z.date()).optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).optional(),
  patient: patientSchema.optional(),
  appointment: z.object({ doctor: z.object({ name: z.string() }) }).optional(),
  // Doctor context snapshot for audit trail (Phase 5)
  doctorName: z.string().optional(),
  doctorEmail: z.string().optional(),
  doctorPhone: z.string().optional(),
  doctorSpecialization: z.string().optional(),
  doctorRole: z.string().optional(),
  doctorRegistrationNumber: z.string().optional(),
  doctorLicenseNumber: z.string().optional(),
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
