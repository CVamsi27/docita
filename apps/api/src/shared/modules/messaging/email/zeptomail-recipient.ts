import { EmailSuppressionReason } from '@workspace/db';
import { isRecord } from '@workspace/utils';

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toAddresses(emailInfo: unknown): string[] {
  if (!isRecord(emailInfo)) return [];
  const out: string[] = [];
  for (const entry of asArray(emailInfo.to)) {
    const address = readEmailAddress(entry);
    if (address) out.push(address);
  }
  return out;
}

export function collectRecipients(
  eventData: Record<string, unknown>,
  emailInfo: unknown,
  reason: EmailSuppressionReason,
): Set<string> {
  const recipients = collectBouncedRecipients(eventData.details);
  if (recipients.size === 0 && usesEmailInfoRecipients(reason)) {
    for (const address of toAddresses(emailInfo)) recipients.add(address);
  }
  return recipients;
}

function collectBouncedRecipients(details: unknown): Set<string> {
  const recipients = new Set<string>();
  for (const detail of asArray(details)) {
    if (isRecord(detail) && typeof detail.bounced_recipient === 'string') {
      recipients.add(detail.bounced_recipient.toLowerCase());
    }
  }
  return recipients;
}

function readEmailAddress(entry: unknown): string | null {
  if (
    isRecord(entry) &&
    isRecord(entry.email_address) &&
    typeof entry.email_address.address === 'string'
  ) {
    return entry.email_address.address.toLowerCase();
  }
  return null;
}

function usesEmailInfoRecipients(reason: EmailSuppressionReason): boolean {
  return (
    reason === EmailSuppressionReason.COMPLAINT ||
    reason === EmailSuppressionReason.UNSUBSCRIBE
  );
}
