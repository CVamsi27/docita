import { z } from "zod";
import { taxTreatmentSchema } from "../billing/tax";
import { invoiceStatusSchema } from "../shared/users";

export const invoiceLineItemFormSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Enter a description"),
  quantity: z.number().min(1, "Enter a quantity of at least 1"),
  price: z.number().min(0, "Enter a valid price"),
  discountAmount: z.number().min(0).optional(),
  taxTreatment: taxTreatmentSchema.optional(),
  taxRate: z.number().min(0).max(100).optional(),
  hsnCode: z.string().optional(),
  sacCode: z.string().optional(),
});

export const invoiceEditFormSchema = z.object({
  status: invoiceStatusSchema,
  discount: z.number().min(0),
  notes: z.string().optional(),
  items: z.array(invoiceLineItemFormSchema).min(1, "Add at least one item"),
});

export const createInvoiceFormSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]),
  discount: z.number().min(0),
  notes: z.string().optional(),
  items: z.array(invoiceLineItemFormSchema).min(1, "Add at least one item"),
});

export type InvoiceLineItemFormValues = z.infer<typeof invoiceLineItemFormSchema>;
export type InvoiceEditFormValues = z.infer<typeof invoiceEditFormSchema>;
export type CreateInvoiceFormValues = z.infer<typeof createInvoiceFormSchema>;
