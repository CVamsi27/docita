import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paymentModeSchema, PaymentMode } from '@workspace/types';

export const createPaymentLinkSchema = z.object({
  invoiceId: z.string(),
  amount: z.number(), // in rupees (will convert to paise)
  currency: z.string().default('INR'),
  paymentMode: paymentModeSchema.optional().default(PaymentMode.ONLINE),
  patientId: z.string(),
  clinicId: z.string(),
  sendWhatsApp: z.boolean().optional().default(true),
  description: z.string().optional(),
});

export class CreatePaymentLinkDto extends createZodDto(
  createPaymentLinkSchema,
) {}
