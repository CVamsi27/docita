import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { createHmac } from 'crypto';
import { WebhookVerifierService } from './webhook-verifier';
import type { WebhookReplayDedupeRepository } from './webhook-replay-dedupe.repository';

const sign = (secret: string, body: Buffer, prefix?: string): string => {
  const digest = createHmac('sha256', secret).update(body).digest('hex');
  return prefix ? `${prefix}${digest}` : digest;
};

describe('WebhookVerifierService', () => {
  let service: WebhookVerifierService;
  let dedupe: {
    tryClaim: jest.MockedFunction<WebhookReplayDedupeRepository['tryClaim']>;
  };

  beforeEach(() => {
    dedupe = { tryClaim: jest.fn() };
    dedupe.tryClaim.mockResolvedValue(true);
    service = new WebhookVerifierService(
      dedupe as unknown as WebhookReplayDedupeRepository,
    );
  });

  it('accepts a valid Razorpay-shaped signature', async () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const signature = sign('shh', body);
    const result = await service.verify({
      provider: 'razorpay',
      rawBody: body,
      signature,
      secret: 'shh',
    });
    expect(result.ok).toBe(true);
    expect(dedupe.tryClaim).toHaveBeenCalledTimes(1);
  });

  it('accepts a valid Meta WhatsApp prefixed signature', async () => {
    const body = Buffer.from(JSON.stringify({ entry: [] }));
    const signature = sign('app-secret', body, 'sha256=');
    const result = await service.verify({
      provider: 'meta-whatsapp',
      rawBody: body,
      signature,
      signaturePrefix: 'sha256=',
      secret: 'app-secret',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects when the secret is missing', async () => {
    const body = Buffer.from('{}');
    const result = await service.verify({
      provider: 'razorpay',
      rawBody: body,
      signature: 'whatever',
      secret: '',
    });
    expect(result.ok).toBe(false);
    expect(result.failure).toBe('missing-secret');
    expect(dedupe.tryClaim).not.toHaveBeenCalled();
  });

  it('rejects when the signature does not match', async () => {
    const body = Buffer.from('{}');
    const result = await service.verify({
      provider: 'razorpay',
      rawBody: body,
      signature: '0'.repeat(64),
      secret: 'shh',
    });
    expect(result.ok).toBe(false);
    expect(result.failure).toBe('invalid-signature');
    expect(dedupe.tryClaim).not.toHaveBeenCalled();
  });

  it('rejects when the signed timestamp is too old', async () => {
    const body = Buffer.from('{}');
    const signature = sign('shh', body);
    const result = await service.verify({
      provider: 'razorpay',
      rawBody: body,
      signature,
      secret: 'shh',
      signedTimestampSeconds: Math.floor(Date.now() / 1000) - 10 * 60,
    });
    expect(result.ok).toBe(false);
    expect(result.failure).toBe('stale-timestamp');
    expect(dedupe.tryClaim).not.toHaveBeenCalled();
  });

  it('rejects when the same signature is replayed within the window', async () => {
    const body = Buffer.from('{}');
    const signature = sign('shh', body);
    dedupe.tryClaim.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const first = await service.verify({
      provider: 'razorpay',
      rawBody: body,
      signature,
      secret: 'shh',
    });
    const second = await service.verify({
      provider: 'razorpay',
      rawBody: body,
      signature,
      secret: 'shh',
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.failure).toBe('replayed');
  });

  it('treats a different provider as a different replay namespace', async () => {
    const body = Buffer.from('{}');
    const signature = sign('shh', body);
    await service.verify({
      provider: 'razorpay',
      rawBody: body,
      signature,
      secret: 'shh',
    });
    const other = await service.verify({
      provider: 'meta-whatsapp',
      rawBody: body,
      signature,
      secret: 'shh',
    });
    expect(other.ok).toBe(true);
    expect(dedupe.tryClaim).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed payloads with a missing signature', async () => {
    const body = Buffer.from('{}');
    const result = await service.verify({
      provider: 'razorpay',
      rawBody: body,
      signature: '',
      secret: 'shh',
    });
    expect(result.ok).toBe(false);
    expect(result.failure).toBe('invalid-signature');
  });
});
