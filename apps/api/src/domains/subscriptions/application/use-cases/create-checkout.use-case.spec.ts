import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CreateCheckoutUseCase } from './create-checkout.use-case';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import type { IClinicOperations } from '@/domains/subscriptions/application/ports/clinic-operations.port';
import type { IPaymentGateway } from '@/domains/subscriptions/application/ports/payment-gateway.port';
import { ProratingService } from '@/domains/subscriptions/core/services/proration.service';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import { SubscriptionCheckoutPricingService } from '@/domains/subscriptions/application/services/subscription-checkout-pricing.service';
import { ActivateSubscriptionUseCase } from '@/domains/subscriptions/application/use-cases/activate-subscription.use-case';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import { createFixedClockMock } from '@/test-utils';

describe('CreateCheckoutUseCase', () => {
  const clock = createFixedClockMock();
  const findReusablePendingCheckoutMock =
    jest.fn<ISubscriptionRepository['findReusablePendingCheckout']>();

  const subscriptionRepo: ISubscriptionRepository = {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => null),
    findByClinicId: jest.fn(async () => null),
    findByStatus: jest.fn(async () => []),
    findApproachingRenewal: jest.fn(async () => []),
    update: jest.fn(async () => undefined),
    markClinicPastDue: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
    findBillingContact: jest.fn(async () => ({
      name: null,
      email: null,
      phoneNumber: null,
    })),
    findExpiryReminderCandidates: jest.fn(async () => []),
    findGraceDeadlineReminderCandidates: jest.fn(async () => []),
    findRecentReminderClinicIds: jest.fn(async () => []),
    createSubscriptionReminders: jest.fn(async () => undefined),
    savePayment: jest.fn(async () => undefined),
    updatePaymentStatus: jest.fn(async () => undefined),
    findPaymentsByClinicId: jest.fn(async () => []),
    findPaymentById: jest.fn(async () => null),
    findPaymentByOrderId: jest.fn(async () => null),
    updatePaymentLink: jest.fn(async () => undefined),
    expireDuplicatePendingCheckouts: jest.fn(async () => 0),
    expireOtherPendingSubscriptionCheckouts: jest.fn(async () => 0),
    findReusablePendingCheckout: findReusablePendingCheckoutMock,
  };

  const clinicOps: IClinicOperations = {
    getClinicDetails: jest.fn(async () => ({
      id: 'clinic-1',
      name: 'Clinic',
      email: 'clinic@example.com',
      phone: '9999999999',
      razorpayCustomerId: 'cust_1',
    })),
    updateRazorpayCustomerId: jest.fn(async () => undefined),
    updateTierAndFeatures: jest.fn(async () => undefined),
    disableAutoPay: jest.fn(async () => undefined),
    enableAutoPay: jest.fn(async () => undefined),
    sendSubscriptionEmail: jest.fn(async () => undefined),
    updateScheduledPlanChange: jest.fn(async () => undefined),
    clearScheduledPlanChange: jest.fn(async () => undefined),
    emitUpdate: jest.fn(async () => undefined),
  } as unknown as IClinicOperations;

  const paymentGateway: IPaymentGateway = {
    createCustomer: jest.fn(async () => 'cust_1'),
    createOrder: jest.fn(async () => ({
      razorpayOrderId: 'order_new',
      amountCents: 99900,
      currency: 'INR',
    })),
    verifyPayment: jest.fn(async () => ({
      verified: true,
      paymentId: 'pay_1',
      orderId: 'order_new',
      amountCents: 99900,
    })),
    createSubscription: jest.fn(async () => ({ subscriptionId: 'sub_1' })),
    cancelSubscription: jest.fn(async () => undefined),
    refundPayment: jest.fn(async () => undefined),
    verifyWebhookSignature: jest.fn(() => true),
  };

  const checkoutPricing = new SubscriptionCheckoutPricingService(
    new SubscriptionPricingService(),
    new ProratingService(),
    clock,
  );
  const activateSubscription = {
    applyPlanChangeWithoutPayment: jest.fn(async () => undefined),
  } as unknown as ActivateSubscriptionUseCase;
  const configService = {
    getCurrencyCode: () => 'INR',
    getRazorpayKeyId: () => 'rzp_test',
  } as unknown as AppConfigService;
  const featureFlagService = {
    getClinicPricingOffer: jest.fn(async () => null),
  } as unknown as FeatureFlagService;

  let useCase: CreateCheckoutUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateCheckoutUseCase(
      subscriptionRepo,
      clinicOps,
      paymentGateway,
      checkoutPricing,
      activateSubscription,
      configService,
      featureFlagService,
    );
  });

  it('reuses a recent pending checkout instead of creating a new one', async () => {
    findReusablePendingCheckoutMock.mockResolvedValue({
      razorpayOrderId: 'order_existing',
    });

    const result = await useCase.execute({
      clinicId: 'clinic-1',
      tier: 'ESSENTIAL',
      cycle: 'MONTHLY',
    });

    expect(result.orderId).toBe('order_existing');
    expect(paymentGateway.createOrder).not.toHaveBeenCalled();
    expect(subscriptionRepo.savePayment).not.toHaveBeenCalled();
    expect(
      subscriptionRepo.expireOtherPendingSubscriptionCheckouts,
    ).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      keepOrderId: 'order_existing',
    });
  });

  it('expires older duplicate pending checkouts after creating a new order', async () => {
    findReusablePendingCheckoutMock.mockResolvedValue(null);

    const result = await useCase.execute({
      clinicId: 'clinic-1',
      tier: 'ESSENTIAL',
      cycle: 'MONTHLY',
    });

    expect(result.orderId).toBe('order_new');
    expect(subscriptionRepo.savePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic-1',
        amountCents: 99900,
        status: 'pending',
        razorpayOrderId: 'order_new',
        description: 'ESSENTIAL MONTHLY subscription',
      }),
    );
    expect(
      subscriptionRepo.expireOtherPendingSubscriptionCheckouts,
    ).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      keepOrderId: 'order_new',
    });
  });
});
