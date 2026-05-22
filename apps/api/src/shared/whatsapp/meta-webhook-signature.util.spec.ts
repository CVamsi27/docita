import { describe, expect, it } from '@jest/globals';
import { createHmac } from 'crypto';
import { verifyMetaWebhookSignature } from '@/shared/whatsapp/meta-webhook-signature.util';

describe('verifyMetaWebhookSignature', () => {
  const secret = 'test-secret';
  const body = Buffer.from('{"entry":[]}');

  it('returns true for a valid signature', () => {
    const digest = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyMetaWebhookSignature(body, `sha256=${digest}`, secret)).toBe(
      true,
    );
  });

  it('returns false for invalid signature', () => {
    expect(verifyMetaWebhookSignature(body, 'sha256=invalid', secret)).toBe(
      false,
    );
  });

  it('returns false when secret or signature is missing', () => {
    expect(verifyMetaWebhookSignature(body, '', secret)).toBe(false);
    expect(verifyMetaWebhookSignature(body, 'sha256=abc', '')).toBe(false);
  });
});
