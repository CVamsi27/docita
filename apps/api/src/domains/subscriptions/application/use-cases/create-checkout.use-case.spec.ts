import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PENDING_CHECKOUT_REUSE_WINDOW_MINUTES } from '@/domains/subscriptions/application/constants/pending-checkout.constants';
import { CreateCheckoutUseCase } from './create-checkout.use-case';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import type { IClinicOperations } from '@/domains/subscriptions/application/ports/clinic-operations.port';
import type { IPaymentGateway } from '@/domains/subscriptions/application/ports/payment-gateway.port';
import { ProratingService } from '@/domains/subscriptions/core/services/proration.service';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import { SubscriptionCheckoutPricingService } from '@/domains/subscriptions/application/services/subscription-checkout-pricing.service';
import { ApplyPlanChangeWithoutPaymentUseCase } from '@/domains/subscriptions/application/use-cases/apply-plan-change-without-payment.use-case';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import { createFixedClockMock } from '@/test-utils';
import { CheckoutPaymentOrderService } from '@/domains/subscriptions/application/services/checkout-payment-order.service';

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
      name: 'Admin Doctor',
      email: 'admin@example.com',
      phoneNumber: '9876543210',
    })),
    findExpiryReminderCandidates: jest.fn(async () => []),
    findGraceDeadlineReminderCandidates: jest.fn(async () => []),
    findRecentReminderClinicIds: jest.fn(async () => []),
    createSubscriptionReminders: jest.fn(async () => undefined),
    savePayment: jest.fn(async () => undefined),
    updatePaymentStatus: jest.fn(async () => undefined),
    updatePaymentStatusById: jest.fn(async () => undefined),
    findPaymentsByClinicId: jest.fn(async () => []),
    findPaymentById: jest.fn(async () => null),
    findPaymentByOrderId: jest.fn(async () => null),
    updatePaymentLink: jest.fn(async () => undefined),
    expireDuplicatePendingCheckouts: jest.fn(async () => 0),
    expireOtherPendingSubscriptionCheckouts: jest.fn(async () => 0),
    findReusablePendingCheckout: findReusablePendingCheckoutMock,
    findPaymentByRazorpayPaymentId: jest.fn(async () => null),
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
    updateCustomer: jest.fn(async () => undefined),
    createOrder: jest.fn(async () => ({
      razorpayOrderId: 'order_new',
      amountCents: 1,
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
  const applyPlanChangeWithoutPayment = {
    execute: jest.fn(async () => undefined),
  } as unknown as ApplyPlanChangeWithoutPaymentUseCase;
  const configService = {
    getCurrencyCode: () => 'INR',
    getRazorpayKeyId: () => 'rzp_test',
  } as unknown as AppConfigService;
  const featureFlagService = {
    getClinicPricingOffer: jest.fn(async () => null),
  } as unknown as FeatureFlagService;
  const referralService = {
    getRedeemableReferralDiscountCents: jest.fn(async () => 0),
  } as unknown as import('@/domains/subscriptions/core/services/referral.service').ReferralService;

  let useCase: CreateCheckoutUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    const checkoutPaymentOrder = new CheckoutPaymentOrderService(
      subscriptionRepo,
      clinicOps,
      paymentGateway,
      configService,
    );
    useCase = new CreateCheckoutUseCase(
      subscriptionRepo,
      clinicOps,
      checkoutPricing,
      checkoutPaymentOrder,
      applyPlanChangeWithoutPayment,
      configService,
      featureFlagService,
      referralService,
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
    expect(findReusablePendingCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic-1',
        withinMinutes: PENDING_CHECKOUT_REUSE_WINDOW_MINUTES,
      }),
    );
    expect(paymentGateway.createOrder).not.toHaveBeenCalled();
    expect(subscriptionRepo.savePayment).not.toHaveBeenCalled();
    expect(
      subscriptionRepo.expireOtherPendingSubscriptionCheckouts,
    ).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      keepOrderId: 'order_existing',
    });
  });

  it('applies a redeemable referral discount to the first-checkout amount', async () => {
    findReusablePendingCheckoutMock.mockResolvedValue(null);
    (
      referralService.getRedeemableReferralDiscountCents as unknown as jest.MockedFunction<
        () => Promise<number>
      >
    ).mockResolvedValueOnce(24975); // 25% of 99900

    const result = await useCase.execute({
      clinicId: 'clinic-1',
      tier: 'ESSENTIAL',
      cycle: 'MONTHLY',
    });

    expect(result.amountCents).toBe(74925);
    expect(subscriptionRepo.savePayment).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 74925 }),
    );
  });

  it('expires older duplicate pending checkouts after creating a new order', async () => {
    findReusablePendingCheckoutMock.mockResolvedValue(null);

    const result = await useCase.execute({
      clinicId: 'clinic-1',
      tier: 'ESSENTIAL',
      cycle: 'MONTHLY',
    });

    expect(result.orderId).toBe('order_new');
    expect(result.amountCents).toBe(99900);
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
    expect(paymentGateway.updateCustomer).toHaveBeenCalledWith(
      'cust_1',
      expect.objectContaining({
        email: 'admin@example.com',
        phone: '9876543210',
      }),
    );
    expect(result.prefill).toEqual(
      expect.objectContaining({
        email: 'admin@example.com',
        contact: '9876543210',
      }),
    );
  });
});
