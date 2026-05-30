import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { createHmac } from 'node:crypto';
import type { WebhookVerifierService } from '@/shared/modules/webhooks/webhook-verifier';
import type { ZeptoMailWebhookRequest } from './zeptomail-webhook-verification.helper';
import { verifyZeptoMailWebhookIngress } from './zeptomail-webhook-verification.helper';

describe('verifyZeptoMailWebhookIngress', () => {
  let verify: jest.MockedFunction<WebhookVerifierService['verify']>;

  beforeEach(() => {
    verify = jest.fn();
  });

  it('returns false when the webhook secret is empty', async () => {
    const result = await verifyZeptoMailWebhookIngress({
      req: { headers: {}, body: {} } as ZeptoMailWebhookRequest,
      secret: '',
      verifier: { verify } as unknown as WebhookVerifierService,
    });
    expect(result).toBe(false);
    expect(verify).not.toHaveBeenCalled();
  });

  it('verifies Authorization header auth via shared-secret-header mode', async () => {
    verify.mockResolvedValue({ ok: true });
    const body = { event_name: ['bounce'] };
    const result = await verifyZeptoMailWebhookIngress({
      req: {
        headers: { authorization: 'Bearer webhook-secret' },
        body,
      } as ZeptoMailWebhookRequest,
      secret: 'Bearer webhook-secret',
      verifier: { verify } as unknown as WebhookVerifierService,
    });
    expect(result).toBe(true);
    expect(verify).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'zeptomail',
        authMode: 'shared-secret-header',
        sharedSecretHeader: 'Bearer webhook-secret',
      }),
    );
  });

  it('verifies x-zoho-signature HMAC auth when present', async () => {
    verify.mockResolvedValue({ ok: true });
    const rawBody = Buffer.from(JSON.stringify({ event_name: ['bounce'] }));
    const signature = createHmac('sha256', 'secret')
      .update(rawBody)
      .digest('hex');
    const result = await verifyZeptoMailWebhookIngress({
      req: {
        headers: { 'x-zoho-signature': signature },
        rawBody,
        body: JSON.parse(rawBody.toString()),
      } as unknown as ZeptoMailWebhookRequest,
      secret: 'secret',
      verifier: { verify } as unknown as WebhookVerifierService,
    });
    expect(result).toBe(true);
    expect(verify).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'zeptomail',
        signature,
      }),
    );
  });
});
