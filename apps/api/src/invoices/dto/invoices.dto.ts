import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { invoiceSchema } from '@workspace/types';

const InvoiceItemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
});

export const CreateInvoiceSchema = z.object({
  appointmentId: z.string().optional(),
  patientId: z.string(),
  total: z.number().nonnegative(),
  status: z.string(), // Could be enum
  items: z.array(InvoiceItemSchema),
  // Doctor context
  doctorName: z.string().optional(),
  doctorEmail: z.string().email().optional(),
  doctorPhone: z.string().optional(),
  doctorSpecialization: z.string().optional(),
  doctorRole: z.string().optional(),
  doctorRegistrationNumber: z.string().optional(),
  doctorLicenseNumber: z.string().optional(),
});

export class CreateInvoiceDto extends createZodDto(CreateInvoiceSchema) {}

export const UpdateInvoiceSchema = z.object({
  status: z.string().optional(),
  total: z.number().nonnegative().optional(),
  items: z.array(InvoiceItemSchema).optional(),
});

export class UpdateInvoiceDto extends createZodDto(UpdateInvoiceSchema) {}

export class InvoiceResponseDto extends createZodDto(invoiceSchema) {}

const PaginatedInvoiceResponseSchema = z.object({
  items: z.array(invoiceSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
  count: z.number().optional(),
});
export class PaginatedInvoiceResponseDto extends createZodDto(
  PaginatedInvoiceResponseSchema,
) {}
