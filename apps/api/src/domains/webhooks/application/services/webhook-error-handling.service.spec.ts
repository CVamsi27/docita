import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { WebhookErrorHandlingService } from './webhook-error-handling.service';
import type { IWebhookEventRepository } from '@/domains/webhooks/application/ports/webhook-event.repository.port';

describe('WebhookErrorHandlingService', () => {
  let service: WebhookErrorHandlingService;
  const createErrorLog = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const createAuditEvent = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  beforeEach(() => {
    jest.clearAllMocks();
    const repo = {
      createErrorLog,
      createAuditEvent,
    } as unknown as IWebhookEventRepository;
    service = new WebhookErrorHandlingService(repo);
  });

  describe('isCriticalError', () => {
    it('flags payment_link and subscription event types as critical', () => {
      expect(
        service.isCriticalError(new Error('anything'), 'payment_link'),
      ).toBe(true);
      expect(
        service.isCriticalError(new Error('anything'), 'subscription'),
      ).toBe(true);
    });

    it('flags errors whose message contains a critical keyword', () => {
      expect(
        service.isCriticalError(new Error('DB constraint violated'), 'order'),
      ).toBe(true);
      expect(
        service.isCriticalError(new Error('payment declined'), 'order'),
      ).toBe(true);
    });

    it('treats a benign error on a non-critical event as non-critical', () => {
      expect(
        service.isCriticalError(new Error('temporary blip'), 'order'),
      ).toBe(false);
    });
  });

  describe('logWebhookError', () => {
    it('persists an error log with a truncated payload hash', async () => {
      createErrorLog.mockResolvedValue({ id: 'log_1' });
      const bigPayload = { blob: 'x'.repeat(500) };

      await service.logWebhookError(new Error('boom'), {
        eventType: 'payment.captured',
        payload: bigPayload,
      });

      const arg = createErrorLog.mock.calls[0][0] as { payloadHash: string };
      expect(arg.payloadHash.length).toBeLessThanOrEqual(100);
    });

    it('swallows repository failures so the webhook path never throws', async () => {
      createErrorLog.mockRejectedValue(new Error('db down'));
      await expect(
        service.logWebhookError(new Error('boom'), { eventType: 'x' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('trackWebhookEvent', () => {
    it('records an audit event with the given status', async () => {
      createAuditEvent.mockResolvedValue(undefined);
      await service.trackWebhookEvent(
        'payment.captured',
        'razorpay',
        'SUCCESS',
      );
      expect(createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'payment.captured',
          providerId: 'razorpay',
          status: 'SUCCESS',
        }),
      );
    });

    it('swallows audit failures (best-effort tracking)', async () => {
      createAuditEvent.mockRejectedValue(new Error('db down'));
      await expect(
        service.trackWebhookEvent('x', 'p', 'FAILED', new Error('e')),
      ).resolves.toBeUndefined();
    });
  });
});
