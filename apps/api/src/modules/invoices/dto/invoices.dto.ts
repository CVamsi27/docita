import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { invoiceSchema } from '@workspace/types';
import { InvoiceStatus } from '@workspace/db';

const InvoiceItemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
});

export const CreateInvoiceSchema = z.object({
  appointmentId: z.string().optional(),
  patientId: z.string(),
  total: z.number().nonnegative(),
  status: z.nativeEnum(InvoiceStatus),
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
  status: z.nativeEnum(InvoiceStatus).optional(),
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
