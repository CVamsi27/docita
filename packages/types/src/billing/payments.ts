import { z } from "zod";
import { jsonObjectSchema } from "../shared/json-schema";

export const PaymentMode = {
  ONLINE: "ONLINE",
  CASH: "CASH",
} as const;
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];

export enum PaymentMethod {
  CASH = "cash",
  CARD = "card",
  UPI = "upi",
  ONLINE = "online",
  NET_BANKING = "netbanking",
  WALLET = "wallet",
}

export const paymentModeSchema = z.enum([PaymentMode.ONLINE, PaymentMode.CASH]);
export const paymentMethodSchema = z.nativeEnum(PaymentMethod);

export interface PaymentRetryInvoice {
  id: string;
  patientId: string;
  total: number;
  status: string;
  createdAt: Date | string;
}

export const createPaymentLinkSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("INR"),
  paymentMode: paymentModeSchema.default(PaymentMode.ONLINE),
  patientId: z.string(),
  clinicId: z.string(),
  sendWhatsApp: z.boolean().default(true),
  description: z.string().optional(),
});
export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>;

export const paymentSessionSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  patientId: z.string(),
  clinicId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum([
    "created",
    "pending",
    "paid",
    "failed",
    "expired",
    "cancelled",
  ]),
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

export const paymentLinkResponseSchema = z.object({
  success: z.boolean(),
  paymentLink: z.string().optional(),
  sessionId: z.string().optional(),
  error: z.string().optional(),
});
export type PaymentLinkResponse = z.infer<typeof paymentLinkResponseSchema>;

export interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
  customer_id: string;
  status: string;
  current_start?: number;
  current_end?: number;
  notes?: Record<string, string>;
}

export interface RazorpayPaymentEntity {
  id: string;
  amount: number;
  currency: string;
  status: string;
  order_id?: string;
  notes?: Record<string, string>;
}

export interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: {
      entity: RazorpaySubscriptionEntity;
    };
    payment?: {
      entity: RazorpayPaymentEntity;
    };
  };
}

export const paymentWebhookPayloadSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z
      .object({
        entity: z.object({
          id: z.string(),
          amount: z.number(),
          currency: z.string(),
          status: z.string(),
          order_id: z.string(),
          notes: z.record(z.string(), z.unknown()).optional(),
        }),
      })
      .optional(),
    payment_link: z
      .object({
        entity: z.object({
          id: z.string(),
          amount: z.number(),
          status: z.string(),
          reference_id: z.string().optional(),
        }),
      })
      .optional(),
  }),
});
export type PaymentWebhookPayload = z.infer<typeof paymentWebhookPayloadSchema>;

/** Prisma `PaymentSession.meta` — channel, reference, notes, etc. */
export const paymentSessionMetaJsonSchema = jsonObjectSchema;

/** Prisma `PaymentSession.webhookPayload` — verified Razorpay webhook body. */
export const paymentSessionWebhookPayloadSchema =
  paymentWebhookPayloadSchema.describe("PaymentSession.webhookPayload");
