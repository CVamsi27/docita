import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  invoiceSchema,
  stripHtmlTags,
  createPaymentLinkSchema as baseCreatePaymentLinkSchema,
  paymentLinkResponseSchema,
  paymentSessionSchema,
  paymentModeSchema,
  PaymentMode,
} from '@workspace/types';
import { DEFAULT_CURRENCY } from '@workspace/utils';

export const CreateInvoiceSchema = invoiceSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    patient: true,
    appointment: true,
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

export const UpdateInvoiceSchema = invoiceSchema.partial().extend({
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

export class InvoiceResponseDto extends createZodDto(invoiceSchema) {}

export const PaginatedInvoiceResponseSchema = z.object({
  items: z.array(invoiceSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
  count: z.number().optional(),
});

export class PaginatedInvoiceResponseDto extends createZodDto(
  PaginatedInvoiceResponseSchema,
) {}

export const BillingCreatePaymentLinkSchema = z.object({
  invoiceId: z.string(),
  amount: z.number(),
  currency: z.string().default(DEFAULT_CURRENCY),
  paymentMode: paymentModeSchema.optional().default(PaymentMode.ONLINE),
  patientId: z.string(),
  clinicId: z.string(),
  sendWhatsApp: z.boolean().optional().default(true),
  description: z.string().optional(),
});

export class CreatePaymentLinkDto extends createZodDto(
  BillingCreatePaymentLinkSchema,
) {}

export class PaymentLinkResponseDto extends createZodDto(
  paymentLinkResponseSchema,
) {}

export class PaymentSessionResponseDto extends createZodDto(
  paymentSessionSchema,
) {}

export const MarkInvoicePaidSchema = z.object({
  paymentMethod: z.enum(['CASH', 'OTHER']).default('CASH'),
  amount: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

export class MarkInvoicePaidDto extends createZodDto(MarkInvoicePaidSchema) {}
