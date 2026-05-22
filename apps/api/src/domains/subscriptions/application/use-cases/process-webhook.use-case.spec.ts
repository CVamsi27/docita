import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ProcessWebhookUseCase } from './process-webhook.use-case';
import type { IPaymentGateway } from '@/domains/subscriptions/application/ports/payment-gateway.port';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import { RazorpayWebhookHandlerRegistry } from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook-handler.registry';
import type { RazorpayWebhookEventHandler } from '@/domains/subscriptions/application/webhooks/razorpay/razorpay-webhook-event-handler.interface';

describe('ProcessWebhookUseCase', () => {
  const paymentGateway: IPaymentGateway = {
    verifyWebhookSignature: jest.fn(() => true),
  } as unknown as IPaymentGateway;

  const adminAlerts = {
    sendAdminAlert: jest.fn(async () => undefined),
  } as unknown as AdminAlertsService;

  const paymentFailedHandler: RazorpayWebhookEventHandler = {
    event: 'payment.failed',
    handle: jest.fn(async () => undefined),
  };

  let useCase: ProcessWebhookUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    const registry = new RazorpayWebhookHandlerRegistry([paymentFailedHandler]);
    useCase = new ProcessWebhookUseCase(paymentGateway, adminAlerts, registry);
  });

  it('rejects webhooks with invalid signatures', async () => {
    jest
      .mocked(paymentGateway.verifyWebhookSignature)
      .mockReturnValueOnce(false);

    await expect(
      useCase.execute('bad-sig', '{}', {
        event: 'payment.failed',
        payload: {},
      }),
    ).rejects.toThrow(BadRequestException);

    expect(paymentFailedHandler.handle).not.toHaveBeenCalled();
  });

  it('dispatches known events to the handler registry', async () => {
    await useCase.execute('sig', '{}', {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_1',
            amount: 100,
            currency: 'INR',
            status: 'failed',
          },
        },
      },
    });

    expect(paymentFailedHandler.handle).toHaveBeenCalled();
  });

  it('ignores unknown events after signature verification', async () => {
    await expect(
      useCase.execute('sig', '{}', {
        event: 'subscription.activated',
        payload: {},
      }),
    ).resolves.toBeUndefined();

    expect(paymentFailedHandler.handle).not.toHaveBeenCalled();
  });
});
