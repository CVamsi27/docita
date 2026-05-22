import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PaymentCapturedWebhookHandler } from '@/domains/subscriptions/application/webhooks/razorpay/handlers/payment-captured.webhook-handler';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import { ActivateSubscriptionUseCase } from '@/domains/subscriptions/application/use-cases/activate-subscription.use-case';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import {
  BillingCycle,
  ClinicTier,
  SubscriptionStatus,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';

describe('PaymentCapturedWebhookHandler', () => {
  const activateSubscription = {
    execute: jest.fn<ActivateSubscriptionUseCase['execute']>(),
  } as unknown as ActivateSubscriptionUseCase;

  const adminAlerts = {
    sendAdminAlert: jest.fn(async () => undefined),
  } as unknown as AdminAlertsService;

  const subscriptionRepo: Pick<
    ISubscriptionRepository,
    'findByClinicId' | 'updatePaymentStatus' | 'updatePaymentStatusById'
  > = {
    findByClinicId: jest.fn(async () => null),
    updatePaymentStatus: jest.fn(async () => undefined),
    updatePaymentStatusById: jest.fn(async () => undefined),
  };

  let handler: PaymentCapturedWebhookHandler;

  const activeSubscription = new Subscription({
    id: 'sub_1',
    clinicId: 'clinic-1',
    plan: ClinicTier.fromString('ESSENTIAL'),
    billingCycle: BillingCycle.fromString('MONTHLY'),
    basePriceCents: 99900,
    status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
    currentPeriodStart: new Date('2026-04-17T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-05-17T23:59:59.999Z'),
    autoPayEnabled: false,
    createdAt: new Date('2026-04-17T00:00:00.000Z'),
    updatedAt: new Date('2026-04-17T00:00:00.000Z'),
    version: 1,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new PaymentCapturedWebhookHandler(
      subscriptionRepo as ISubscriptionRepository,
      activateSubscription,
      adminAlerts,
    );
  });

  it('activates checkout payments that include tier and cycle in notes', async () => {
    await handler.handle({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_checkout',
            order_id: 'order_checkout',
            amount: 99900,
            currency: 'INR',
            notes: {
              clinicId: 'clinic-1',
              tier: 'ESSENTIAL',
              cycle: 'MONTHLY',
            },
          },
        },
      },
    });

    expect(activateSubscription.execute).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      razorpayPaymentId: 'pay_checkout',
      razorpayOrderId: 'order_checkout',
      razorpaySignature: '',
      tier: 'ESSENTIAL',
      cycle: 'MONTHLY',
      skipPaymentVerification: true,
      verifiedAmountCents: 99900,
    });
    expect(subscriptionRepo.findByClinicId).not.toHaveBeenCalled();
  });

  it('activates resume-link payments using the clinic subscription plan when tier notes are missing', async () => {
    jest
      .mocked(subscriptionRepo.findByClinicId)
      .mockResolvedValueOnce(activeSubscription);

    await handler.handle({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_resume',
            order_id: 'order_resume',
            amount: 99900,
            currency: 'INR',
            notes: {
              clinic_id: 'clinic-1',
              purpose: 'subscription_payment_resume',
            },
          },
        },
      },
    });

    expect(activateSubscription.execute).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      razorpayPaymentId: 'pay_resume',
      razorpayOrderId: 'order_resume',
      razorpaySignature: '',
      tier: 'ESSENTIAL',
      cycle: 'MONTHLY',
      skipPaymentVerification: true,
      verifiedAmountCents: 99900,
    });
  });

  it('marks the order paid when no subscription exists for the clinic', async () => {
    await handler.handle({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_orphan',
            order_id: 'order_orphan',
            amount: 100,
            currency: 'INR',
            notes: { clinicId: 'clinic-missing' },
          },
        },
      },
    });

    expect(activateSubscription.execute).not.toHaveBeenCalled();
    expect(subscriptionRepo.updatePaymentStatus).toHaveBeenCalledWith(
      'order_orphan',
      'paid',
      { paymentId: 'pay_orphan' },
    );
  });

  it('activates payment-link resume captures without an order id', async () => {
    jest
      .mocked(subscriptionRepo.findByClinicId)
      .mockResolvedValueOnce(activeSubscription);

    await handler.handle({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_link',
            amount: 99900,
            currency: 'INR',
            notes: {
              clinicId: 'clinic-1',
              subscriptionPaymentId: 'sp_resume_1',
              source: 'subscription_payment_resume',
            },
          },
        },
      },
    });

    expect(activateSubscription.execute).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      razorpayPaymentId: 'pay_link',
      razorpayOrderId: '',
      razorpaySignature: '',
      tier: 'ESSENTIAL',
      cycle: 'MONTHLY',
      subscriptionPaymentId: 'sp_resume_1',
      skipPaymentVerification: true,
      verifiedAmountCents: 99900,
    });
  });

  it('ignores payloads without a clinic id', async () => {
    await handler.handle({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_no_clinic',
            order_id: 'order_no_clinic',
            amount: 100,
            currency: 'INR',
            notes: {},
          },
        },
      },
    });

    expect(activateSubscription.execute).not.toHaveBeenCalled();
    expect(subscriptionRepo.updatePaymentStatus).not.toHaveBeenCalled();
  });
});
