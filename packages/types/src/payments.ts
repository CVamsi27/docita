import { z } from "zod";

/**
 * =====================================================
 * PAYMENT TYPES
 * =====================================================
 */

// =====================================================
// PAYMENT ENUMS (for NestJS compatibility)
// =====================================================

export enum PaymentMode {
  ONLINE = 'ONLINE',
  CASH = 'CASH',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
  ONLINE = 'online',
  NET_BANKING = 'netbanking',
  WALLET = 'wallet',
}

// Zod schemas for validation
export const paymentModeSchema = z.nativeEnum(PaymentMode);
export const paymentMethodSchema = z.nativeEnum(PaymentMethod);

// =====================================================
// PAYMENT LINK DTO
// =====================================================

export const createPaymentLinkSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(), // in rupees (will convert to paise)
  currency: z.string().default('INR'),
  paymentMode: paymentModeSchema.default(PaymentMode.ONLINE),
  patientId: z.string(),
  clinicId: z.string(),
  sendWhatsApp: z.boolean().default(true),
  description: z.string().optional(),
});
export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>;

// =====================================================
// PAYMENT SESSION
// =====================================================

export const paymentSessionSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  patientId: z.string(),
  clinicId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(['created', 'pending', 'paid', 'failed', 'expired', 'cancelled']),
  paymentMode: paymentModeSchema,
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  paymentLinkUrl: z.string().optional(),
  expiresAt: z.string().or(z.date()).optional(),
  paidAt: z.string().or(z.date()).optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type PaymentSession = z.infer<typeof paymentSessionSchema>;

// =====================================================
// PAYMENT LINK RESPONSE
// =====================================================

export const paymentLinkResponseSchema = z.object({
  success: z.boolean(),
  paymentLink: z.string().optional(),
  sessionId: z.string().optional(),
  error: z.string().optional(),
});
export type PaymentLinkResponse = z.infer<typeof paymentLinkResponseSchema>;

// =====================================================
// PAYMENT WEBHOOK
// =====================================================

export const paymentWebhookPayloadSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        amount: z.number(),
        currency: z.string(),
        status: z.string(),
        order_id: z.string(),
        notes: z.record(z.string(), z.unknown()).optional(),
      }),
    }).optional(),
    payment_link: z.object({
      entity: z.object({
        id: z.string(),
        amount: z.number(),
        status: z.string(),
        reference_id: z.string().optional(),
      }),
    }).optional(),
  }),
});
export type PaymentWebhookPayload = z.infer<typeof paymentWebhookPayloadSchema>;
