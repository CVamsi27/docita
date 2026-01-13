import { z } from "zod";

export const BillingPortalUrlSchema = z.object({
    url: z.string().url(),
});

export const InvoiceSchema = z.object({
    id: z.string(),
    amountDue: z.number(),
    amountPaid: z.number(),
    status: z.string(),
    created: z.number(),
    pdfUrl: z.string().url().optional(),
    invoiceUrl: z.string().url().optional(),
});

export const PaymentMethodSchema = z.object({
    id: z.string(),
    type: z.string(),
    last4: z.string(),
    expMonth: z.number(),
    expYear: z.number(),
    brand: z.string(),
});

export const CheckoutSessionSchema = z.object({
    sessionId: z.string(),
    url: z.string().url().optional(),
});
