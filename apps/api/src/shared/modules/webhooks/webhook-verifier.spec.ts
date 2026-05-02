import { describe, expect, it, beforeEach } from '@jest/globals';
import { createHmac } from 'crypto';
import type { Cache } from 'cache-manager';
import { WebhookVerifierService } from './webhook-verifier';

function buildMemoryCache(): Cache {
  const store = new Map<string, { value: unknown; expiresAt: number }>();
  return {
    get: async (key: string) => {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set: async (key: string, value: unknown, ttlMs?: number) => {
      store.set(key, {
        value,
        expiresAt: ttlMs ? Date.now() + ttlMs : 0,
      });
    },
    del: async (key: string) => {
      store.delete(key);
    },
    reset: async () => {
      store.clear();
    },
  } as unknown as Cache;
}

const sign = (secret: string, body: Buffer, prefix?: string): string => {
  const digest = createHmac('sha256', secret).update(body).digest('hex');
  return prefix ? `${prefix}${digest}` : digest;
};

describe('WebhookVerifierService', () => {
  let service: WebhookVerifierService;
  let cache: Cache;

  beforeEach(() => {
    cache = buildMemoryCache();
    service = new WebhookVerifierService(cache);
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
  });

  it('rejects when the same signature is replayed within the window', async () => {
    const body = Buffer.from('{}');
    const signature = sign('shh', body);
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
