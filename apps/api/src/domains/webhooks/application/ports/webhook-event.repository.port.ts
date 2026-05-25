export type WebhookErrorLogInput = {
  clinicId?: string;
  userId?: string;
  eventType: string;
  providerId?: string;
  payloadHash: string | null;
  message: string;
  stack?: string;
  isCritical: boolean;
  ipAddress?: string;
  userAgent?: string;
};

export type WebhookAuditEventInput = {
  eventType: string;
  providerId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorMessage?: string;
};

export interface IWebhookEventRepository {
  createErrorLog(input: WebhookErrorLogInput): Promise<{ id: string }>;
  createAuditEvent(input: WebhookAuditEventInput): Promise<void>;
}

export const WEBHOOK_EVENT_REPOSITORY_TOKEN = 'IWebhookEventRepository';
