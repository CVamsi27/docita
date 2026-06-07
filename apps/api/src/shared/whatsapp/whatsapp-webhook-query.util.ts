// jscpd:ignore-start
import type { Request } from 'express';

interface WhatsAppWebhookVerificationQuery {
  mode?: string;
  verifyToken?: string;
  challenge?: string;
}

const readQueryString = (
  query: Request['query'],
  key: string,
): string | undefined => {
  const value = query[key];

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    const [first] = value;
    return typeof first === 'string' && first.trim().length > 0
      ? first
      : undefined;
  }

  return undefined;
};
// jscpd:ignore-end

export function readWhatsAppWebhookVerificationQuery(
  query: Request['query'],
): WhatsAppWebhookVerificationQuery {
  return {
    mode: readQueryString(query, 'hub.mode'),
    verifyToken: readQueryString(query, 'hub.verify_token'),
    challenge: readQueryString(query, 'hub.challenge'),
  };
}
