export interface PaymentRetryInvoice {
  id: string;
  patientId: string;
  total: number;
  status: string;
  createdAt: Date | string;
}


export interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: Record<string, unknown>;
  created_at: number;
}
