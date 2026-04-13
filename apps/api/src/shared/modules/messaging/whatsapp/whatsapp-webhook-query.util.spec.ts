import { describe, expect, it } from '@jest/globals';
import { readWhatsAppWebhookVerificationQuery } from './whatsapp-webhook-query.util';

describe('readWhatsAppWebhookVerificationQuery', () => {
  it('returns undefined values for empty crawler requests', () => {
    expect(readWhatsAppWebhookVerificationQuery({})).toEqual({
      mode: undefined,
      verifyToken: undefined,
      challenge: undefined,
    });
  });

  it('reads verification tokens from query strings and arrays', () => {
    expect(
      readWhatsAppWebhookVerificationQuery({
        'hub.mode': ['subscribe'],
        'hub.verify_token': 'verify-token',
        'hub.challenge': ['123456'],
      }),
    ).toEqual({
      mode: 'subscribe',
      verifyToken: 'verify-token',
      challenge: '123456',
    });
  });
});
