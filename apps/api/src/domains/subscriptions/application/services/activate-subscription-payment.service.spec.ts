import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ActivateSubscriptionPaymentService } from '@/domains/subscriptions/application/services/activate-subscription-payment.service';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';

describe('ActivateSubscriptionPaymentService', () => {
  const subscriptionRepo: Pick<
    ISubscriptionRepository,
    'findPaymentById' | 'findPaymentByOrderId'
  > = {
    findPaymentById: jest.fn(async () => ({
      id: 'sp_link',
      clinicId: 'clinic-1',
      amountCents: 99900,
      currency: 'INR',
      status: 'pending',
      razorpayOrderId: null,
    })),
    findPaymentByOrderId: jest.fn(async () => null),
  };

  const paymentGateway = {
    verifyPayment: jest.fn(),
  };

  let service: ActivateSubscriptionPaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActivateSubscriptionPaymentService(
      subscriptionRepo as ISubscriptionRepository,
      paymentGateway as never,
    );
  });

  it('resolves activation by subscription payment id for payment-link rows', async () => {
    const result = await service.resolvePaymentForActivation({
      clinicId: 'clinic-1',
      subscriptionPaymentId: 'sp_link',
      razorpayOrderId: '',
      razorpayPaymentId: 'pay_link',
      razorpaySignature: '',
      payableAmountPaise: 1,
      skipPaymentVerification: true,
      verifiedAmountCents: 99900,
    });

    expect(result.payment.id).toBe('sp_link');
    expect(subscriptionRepo.findPaymentById).toHaveBeenCalledWith(
      'clinic-1',
      'sp_link',
    );
    expect(subscriptionRepo.findPaymentByOrderId).not.toHaveBeenCalled();
  });

  it('rejects payment-link activation when captured amount does not match the row', async () => {
    await expect(
      service.resolvePaymentForActivation({
        clinicId: 'clinic-1',
        subscriptionPaymentId: 'sp_link',
        razorpayOrderId: '',
        razorpayPaymentId: 'pay_link',
        razorpaySignature: '',
        payableAmountPaise: 1,
        skipPaymentVerification: true,
        verifiedAmountCents: 99800,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
