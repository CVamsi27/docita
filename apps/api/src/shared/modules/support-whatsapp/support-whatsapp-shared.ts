import type {
  SupportWhatsAppMessageStatus,
  WhatsAppWebhookPayload,
} from '@workspace/types';
import { Prisma } from '@workspace/db';

export type WebhookValue = WhatsAppWebhookPayload['entry'][0]['changes'][0]['value'];
export type WebhookMessage = NonNullable<WebhookValue['messages']>[number];

export const SUPPORT_EMAIL = 'support@docita.work';
export const AUTO_REPLY_COOLDOWN_MS = 10 * 60 * 1000;

export const threadMessageSelect = {
  id: true,
  providerMessageId: true,
  providerSentMessageId: true,
  threadPhoneNumber: true,
  supportPhoneNumber: true,
  senderPhoneNumber: true,
  senderName: true,
  direction: true,
  messageType: true,
  messageBody: true,
  status: true,
  receivedAt: true,
  respondedAt: true,
  replyToProviderMessageId: true,
  errorMessage: true,
} as const;

export function extractMessageBody(message: WebhookMessage): string {
  if (message.type === 'text') {
    return message.text?.body?.trim() || '[text]';
  }

  if (message.type === 'interactive') {
    const reply =
      message.interactive?.button_reply?.title ??
      message.interactive?.list_reply?.title ??
      message.interactive?.button_reply?.id ??
      message.interactive?.list_reply?.id;

    return reply?.trim() || '[interactive]';
  }

  if (message.type === 'button') {
    return (
      message.button?.text?.trim() ||
      message.button?.payload?.trim() ||
      '[button]'
    );
  }

  return `[${message.type}]`;
}

export function parseTimestamp(timestamp: string, fallbackNow: Date): Date {
  const parsed = Number(timestamp);
  if (Number.isFinite(parsed) && parsed > 0) {
    return new Date(parsed * 1000);
  }

  return fallbackNow;
}

export function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, '');
}

export function mapProviderStatus(
  status: string,
): SupportWhatsAppMessageStatus | null {
  switch (status.toLowerCase()) {
    case 'sent':
      return 'SENT';
    case 'delivered':
      return 'DELIVERED';
    case 'read':
      return 'READ';
    case 'failed':
      return 'FAILED';
    default:
      return null;
  }
}

export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
