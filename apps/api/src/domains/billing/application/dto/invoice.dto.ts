import { z } from 'zod';

export const CreateInvoiceItemDtoSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().positive('Unit price must be greater than 0'),
  taxRate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),
  discount: z
    .number()
    .min(0)
    .max(100, 'Discount must be between 0 and 100')
    .optional()
    .default(0),
});

export type CreateInvoiceItemDto = z.infer<typeof CreateInvoiceItemDtoSchema>;

export const CreateInvoiceDtoSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  clinicId: z.string().uuid('Invalid clinic ID'),
  items: z
    .array(CreateInvoiceItemDtoSchema)
    .min(1, 'At least one item is required'),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  notes: z.string().optional(),
});

export type CreateInvoiceDto = z.infer<typeof CreateInvoiceDtoSchema>;

export const InvoiceItemResponseDtoSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  taxRate: z.number(),
  discount: z.number(),
  subtotal: z.number(),
  taxAmount: z.number(),
  total: z.number(),
});

export type InvoiceItemResponseDto = z.infer<
  typeof InvoiceItemResponseDtoSchema
>;

export const InvoiceResponseDtoSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  patientId: z.string(),
  status: z.enum([
    'DRAFT',
    'ISSUED',
    'SENT',
    'VIEWED',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED',
    'CREDIT_MEMO',
  ]),
  items: z.array(InvoiceItemResponseDtoSchema),
  subtotal: z.number(),
  taxAmount: z.number(),
  total: z.number(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  isOverdue: z.boolean(),
  notes: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type InvoiceResponseDto = z.infer<typeof InvoiceResponseDtoSchema>;

export const UpdateInvoiceDtoSchema = CreateInvoiceDtoSchema.partial();

export type UpdateInvoiceDto = z.infer<typeof UpdateInvoiceDtoSchema>;
