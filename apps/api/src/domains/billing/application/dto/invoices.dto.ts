import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  createInvoiceRequestSchema,
  invoiceResponseSchema,
  invoicePaymentActivityResponseSchema,
  listInvoicesQuerySchema,
  paginatedInvoiceListResponseSchema,
  stripHtmlTags,
  updateInvoiceRequestSchema,
} from '@workspace/types';
import { InvoiceStatus as _InvoiceStatus } from '@workspace/db';

export const CreateInvoiceSchema = createInvoiceRequestSchema
  .omit({
    clinicId: true,
    paymentMethod: true,
    paidAt: true,
    totalAmount: true,
  })
  .extend({
    doctorName: z.string().max(100).transform(stripHtmlTags).optional(),
    doctorEmail: z
      .string()
      .email()
      .max(255)
      .transform(stripHtmlTags)
      .optional(),
    doctorPhone: z.string().max(20).transform(stripHtmlTags).optional(),
    doctorSpecialization: z
      .string()
      .max(100)
      .transform(stripHtmlTags)
      .optional(),
    doctorRole: z.string().max(50).transform(stripHtmlTags).optional(),
    doctorRegistrationNumber: z
      .string()
      .max(100)
      .transform(stripHtmlTags)
      .optional(),
    doctorLicenseNumber: z
      .string()
      .max(100)
      .transform(stripHtmlTags)
      .optional(),
  });

export class CreateInvoiceDto extends createZodDto(CreateInvoiceSchema) {}

export const UpdateInvoiceSchema = updateInvoiceRequestSchema.extend({
  doctorName: z.string().max(100).transform(stripHtmlTags).optional(),
  doctorEmail: z.string().email().max(255).transform(stripHtmlTags).optional(),
  doctorPhone: z.string().max(20).transform(stripHtmlTags).optional(),
  doctorSpecialization: z.string().max(100).transform(stripHtmlTags).optional(),
  doctorRole: z.string().max(50).transform(stripHtmlTags).optional(),
  doctorRegistrationNumber: z
    .string()
    .max(100)
    .transform(stripHtmlTags)
    .optional(),
  doctorLicenseNumber: z.string().max(100).transform(stripHtmlTags).optional(),
});

export class UpdateInvoiceDto extends createZodDto(UpdateInvoiceSchema) {}

export const ListInvoicesQuerySchema = listInvoicesQuerySchema;
export class ListInvoicesQueryDto extends createZodDto(
  ListInvoicesQuerySchema,
) {}

export class InvoiceResponseDto extends createZodDto(invoiceResponseSchema) {}

export class PaginatedInvoiceResponseDto extends createZodDto(
  paginatedInvoiceListResponseSchema,
) {}

export class InvoicePaymentActivityResponseDto extends createZodDto(
  invoicePaymentActivityResponseSchema,
) {}
