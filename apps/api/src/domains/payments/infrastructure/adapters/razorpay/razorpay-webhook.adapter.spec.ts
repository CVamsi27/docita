import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it } from '@jest/globals';
import * as crypto from 'crypto';
import { RazorpayWebhookAdapter } from './razorpay-webhook.adapter';
import { RazorpayClientAdapter } from './razorpay-client.adapter';
import type { IClock } from '@/shared/common/ports/clock.port';
import { PaymentProvider } from '@/domains/payments/core/entities/payment-provider.enum';

const WEBHOOK_SECRET = 'whsec_test_123';

function sign(payload: string, secret = WEBHOOK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

describe('RazorpayWebhookAdapter', () => {
  let adapter: RazorpayWebhookAdapter;
  const fixedNow = new Date('2026-07-05T10:00:00.000Z');

  beforeEach(() => {
    const configService = Object.create(
      ConfigService.prototype,
    ) as ConfigService;
    configService.get = ((propertyPath: string) => {
      if (propertyPath === 'RAZORPAY_WEBHOOK_SECRET') return WEBHOOK_SECRET;
      if (propertyPath === 'RAZORPAY_KEY_ID') return 'rzp_test_key';
      if (propertyPath === 'RAZORPAY_KEY_SECRET') return 'rzp_test_secret';
      return undefined;
    }) as ConfigService['get'];

    const razorpayClient = new RazorpayClientAdapter(configService);
    const clock: IClock = { now: () => fixedNow };

    adapter = new RazorpayWebhookAdapter(razorpayClient, configService, clock);
  });

  describe('verifyWebhookSignature', () => {
    it('accepts a signature computed with the configured secret', () => {
      const payload = JSON.stringify({ event: 'payment.captured' });
      expect(adapter.verifyWebhookSignature(payload, sign(payload))).toBe(true);
    });

    it('accepts a Buffer payload (raw body path)', () => {
      const payload = JSON.stringify({ event: 'payment.captured' });
      const buf = Buffer.from(payload, 'utf8');
      expect(adapter.verifyWebhookSignature(buf, sign(payload))).toBe(true);
    });

    it('rejects a signature produced with the wrong secret', () => {
      const payload = JSON.stringify({ event: 'payment.captured' });
      const forged = sign(payload, 'attacker_secret');
      expect(adapter.verifyWebhookSignature(payload, forged)).toBe(false);
    });

    it('rejects a tampered payload against a valid signature', () => {
      const original = JSON.stringify({ event: 'payment.captured', amt: 100 });
      const signature = sign(original);
      const tampered = JSON.stringify({ event: 'payment.captured', amt: 999 });
      expect(adapter.verifyWebhookSignature(tampered, signature)).toBe(false);
    });

    it('rejects when a signature of a different length is supplied', () => {
      const payload = JSON.stringify({ event: 'payment.captured' });
      expect(adapter.verifyWebhookSignature(payload, 'short')).toBe(false);
    });

    it('returns false (fails closed) when the secret is not configured', () => {
      (
        adapter as unknown as { configService: ConfigService }
      ).configService.get = (() => undefined) as ConfigService['get'];
      const payload = JSON.stringify({ event: 'payment.captured' });
      expect(adapter.verifyWebhookSignature(payload, sign(payload))).toBe(
        false,
      );
    });
  });

  describe('parseWebhookEvent', () => {
    it('normalizes provider event names to internal event types', () => {
      const cases: Array<[string, string]> = [
        ['subscription.charged', 'subscription.renewed'],
        ['payment.captured', 'payment.succeeded'],
        ['payment.failed', 'payment.failed'],
        ['payment_link.paid', 'payment_link.paid'],
        ['subscription.halted', 'subscription.halted'],
      ];
      for (const [incoming, expected] of cases) {
        expect(adapter.parseWebhookEvent({ event: incoming }).type).toBe(
          expected,
        );
      }
    });

    it('passes through unmapped event names unchanged', () => {
      const event = adapter.parseWebhookEvent({ event: 'order.paid' });
      expect(event.type).toBe('order.paid');
    });

    it('stamps provider, injected clock time, and preserves the payload', () => {
      const payload = { event: 'payment.captured', payload: { foo: 'bar' } };
      const event = adapter.parseWebhookEvent(payload);

      expect(event.provider).toBe(PaymentProvider.RAZORPAY);
      expect(event.timestamp).toEqual(fixedNow);
      expect(event.data).toBe(payload);
      expect(event.id).toEqual(expect.any(String));
    });

    it('produces a unique id per parsed event', () => {
      const a = adapter.parseWebhookEvent({ event: 'payment.captured' });
      const b = adapter.parseWebhookEvent({ event: 'payment.captured' });
      expect(a.id).not.toEqual(b.id);
    });
  });
});
