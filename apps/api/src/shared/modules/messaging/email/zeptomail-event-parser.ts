import { isRecord } from '@workspace/utils';
import type { ParsedSuppressionEvent } from './zeptomail-event-types';
import { reasonFromKeywords } from './zeptomail-reason';
import { asArray, collectRecipients } from './zeptomail-recipient';

export function parseZeptoMailEvents(
  payload: unknown,
): ParsedSuppressionEvent[] {
  if (!isRecord(payload)) return [];
  const topNames = asArray(payload.event_name).filter(
    (value): value is string => typeof value === 'string',
  );
  return asArray(payload.event_message).flatMap((message) =>
    parseMessageEvents(message, topNames),
  );
}

function parseMessageEvents(
  message: unknown,
  topNames: string[],
): ParsedSuppressionEvent[] {
  if (!isRecord(message)) return [];
  return asArray(message.event_data).flatMap((eventData) =>
    parseEventData(eventData, topNames, message.email_info),
  );
}

function parseEventData(
  eventData: unknown,
  topNames: string[],
  emailInfo: unknown,
): ParsedSuppressionEvent[] {
  if (!isRecord(eventData)) return [];
  const objectType =
    typeof eventData.object === 'string' ? eventData.object : '';
  const reason = reasonFromKeywords([...topNames, objectType]);
  if (!reason) return [];
  return Array.from(collectRecipients(eventData, emailInfo, reason)).map(
    (email) => ({
      email,
      reason,
    }),
  );
}
