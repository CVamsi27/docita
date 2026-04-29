import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ActivateSubscriptionUseCase } from './activate-subscription.use-case';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import type { IClinicOperations } from '@/domains/subscriptions/application/ports/clinic-operations.port';
import type { IPaymentGateway } from '@/domains/subscriptions/application/ports/payment-gateway.port';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';

describe('ActivateSubscriptionUseCase', () => {
  const subscriptionRepo: ISubscriptionRepository = {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => null),
    findByClinicId: jest.fn(async () => null),
    findByStatus: jest.fn(async () => []),
    findApproachingRenewal: jest.fn(async () => []),
    update: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
    savePayment: jest.fn(async () => undefined),
    updatePaymentStatus: jest.fn(async () => undefined),
    findPaymentsByClinicId: jest.fn(async () => []),
    findPaymentById: jest.fn(async () => null),
    findPaymentByOrderId: jest.fn(async () => ({
      id: 'sp_1',
      clinicId: 'clinic-1',
      amountCents: 99900,
      currency: 'INR',
      status: 'pending',
      razorpayOrderId: 'order_1',
    })),
    updatePaymentLink: jest.fn(async () => undefined),
    expireDuplicatePendingCheckouts: jest.fn(async () => 0),
    findReusablePendingCheckout: jest.fn(async () => null),
  };

  const clinicOps: IClinicOperations = {
    getClinicDetails: jest.fn(),
    updateRazorpayCustomerId: jest.fn(async () => undefined),
    updateTierAndFeatures: jest.fn(async () => undefined),
    emitUpdate: jest.fn(async () => undefined),
    disableAutoPay: jest.fn(async () => undefined),
    enableAutoPay: jest.fn(async () => undefined),
    sendSubscriptionEmail: jest.fn(async () => undefined),
    updateScheduledPlanChange: jest.fn(async () => undefined),
    clearScheduledPlanChange: jest.fn(async () => undefined),
  } as unknown as IClinicOperations;

  const paymentGateway: IPaymentGateway = {
    createCustomer: jest.fn(async () => 'cust_1'),
    createOrder: jest.fn(),
    verifyPayment: jest.fn(async () => ({
      verified: true,
      paymentId: 'pay_1',
      orderId: 'order_1',
      amountCents: 99900,
    })),
    createSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    refundPayment: jest.fn(),
    verifyWebhookSignature: jest.fn(() => true),
  } as unknown as IPaymentGateway;

  const featureFlagService = {
    getClinicPricingOffer: jest.fn(async () => null),
  } as unknown as FeatureFlagService;

  let useCase: ActivateSubscriptionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ActivateSubscriptionUseCase(
      subscriptionRepo,
      clinicOps,
      paymentGateway,
      new SubscriptionPricingService(),
      featureFlagService,
    );
  });

  const request = {
    clinicId: 'clinic-1',
    razorpayPaymentId: 'pay_1',
    razorpayOrderId: 'order_1',
    razorpaySignature: 'sig_1',
    tier: 'ESSENTIAL',
    cycle: 'MONTHLY',
  };

  it('rejects activation when the Razorpay signature cannot be verified', async () => {
    jest.mocked(paymentGateway.verifyPayment).mockResolvedValueOnce({
      verified: false,
      paymentId: '',
      orderId: '',
      amountCents: 0,
    });

    await expect(useCase.execute(request)).rejects.toThrow(BadRequestException);
    expect(subscriptionRepo.save).not.toHaveBeenCalled();
    expect(subscriptionRepo.updatePaymentStatus).not.toHaveBeenCalled();
  });

  it('rejects activation when the order does not belong to the clinic', async () => {
    jest
      .mocked(subscriptionRepo.findPaymentByOrderId)
      .mockResolvedValueOnce(null);

    await expect(useCase.execute(request)).rejects.toThrow(BadRequestException);
    expect(paymentGateway.verifyPayment).not.toHaveBeenCalled();
    expect(subscriptionRepo.save).not.toHaveBeenCalled();
  });

  it('rejects activation when the paid amount does not match the pending payment', async () => {
    jest.mocked(paymentGateway.verifyPayment).mockResolvedValueOnce({
      verified: true,
      paymentId: 'pay_1',
      orderId: 'order_1',
      amountCents: 99800,
    });

    await expect(useCase.execute(request)).rejects.toThrow(BadRequestException);
    expect(subscriptionRepo.save).not.toHaveBeenCalled();
    expect(subscriptionRepo.updatePaymentStatus).not.toHaveBeenCalled();
  });
});
