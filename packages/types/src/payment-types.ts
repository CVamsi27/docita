export interface PaymentRetryInvoice {
  id: string;
  patientId: string;
  total: number;
  status: string;
  createdAt: Date | string;
}

// =====================================================
// NOTE: RazorpayWebhookPayload moved to payments.ts
// Import from there if needed: import type { RazorpayWebhookPayload } from './payments'
// =====================================================
