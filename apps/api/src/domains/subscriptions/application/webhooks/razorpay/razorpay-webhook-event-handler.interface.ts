import { type RazorpayWebhookPayload } from '@workspace/types';

export interface RazorpayWebhookEventHandler {
  readonly event: string;
  handle(payload: RazorpayWebhookPayload): Promise<void>;
}

export const RAZORPAY_WEBHOOK_HANDLERS = Symbol('RAZORPAY_WEBHOOK_HANDLERS');
