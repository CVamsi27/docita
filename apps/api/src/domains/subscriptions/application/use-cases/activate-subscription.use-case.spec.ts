import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ActivateSubscriptionUseCase } from './activate-subscription.use-case';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import { ActivateSubscriptionPaymentService } from '@/domains/subscriptions/application/services/activate-subscription-payment.service';
import { ActivateSubscriptionClinicSyncService } from '@/domains/subscriptions/application/services/activate-subscription-clinic-sync.service';
import type { IClinicOperations } from '@/domains/subscriptions/application/ports/clinic-operations.port';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import { ProratingService } from '@/domains/subscriptions/core/services/proration.service';
import { SubscriptionCheckoutPricingService } from '@/domains/subscriptions/application/services/subscription-checkout-pricing.service';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { SubscriptionActivationPolicyService } from '@/domains/subscriptions/application/services/subscription-activation-policy.service';
import { SubscriptionBillingSnapshotService } from '@/domains/subscriptions/application/services/subscription-billing-snapshot.service';
import { createFixedClockMock } from '@/test-utils';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import {
  BillingCycle,
  ClinicTier,
  SubscriptionStatus,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects';

describe('ActivateSubscriptionUseCase', () => {
  const clock = createFixedClockMock();
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
    updatePaymentStatusById: jest.fn(async () => undefined),
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
    expireOtherPendingSubscriptionCheckouts: jest.fn(async () => 0),
    findReusablePendingCheckout: jest.fn(async () => null),
    findPaymentByRazorpayPaymentId: jest.fn(async () => null),
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

  const paymentGateway = {
    createCustomer: jest.fn(async () => 'cust_1'),
    updateCustomer: jest.fn(async () => undefined),
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
  };

  const featureFlagService = {
    getClinicPricingOffer: jest.fn(async () => null),
  } as unknown as FeatureFlagService;

  const checkoutPricing = new SubscriptionCheckoutPricingService(
    new SubscriptionPricingService(),
    new ProratingService(),
    clock,
  );

  const configService = {
    getCurrencyCode: jest.fn(() => 'INR'),
  } as unknown as AppConfigService;

  const activationPolicy = new SubscriptionActivationPolicyService();
  const billingSnapshot = new SubscriptionBillingSnapshotService(
    subscriptionRepo,
    clinicOps,
    activationPolicy,
    {
      createInvoice: jest.fn(async () => null),
      listInvoicesByCustomer: jest.fn(async () => []),
    } as never,
    clock,
  );

  const activationPayment = new ActivateSubscriptionPaymentService(
    subscriptionRepo,
    paymentGateway as never,
  );

  const clinicSync = new ActivateSubscriptionClinicSyncService(
    clinicOps,
    activationPolicy,
  );

  let useCase: ActivateSubscriptionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ActivateSubscriptionUseCase(
      subscriptionRepo,
      new SubscriptionPricingService(),
      featureFlagService,
      checkoutPricing,
      configService,
      activationPolicy,
      billingSnapshot,
      activationPayment,
      clinicSync,
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

  it('anchors a lapsed same-plan renewal from the day after the previous period ended', async () => {
    const lapsedClock = createFixedClockMock('2026-05-22T10:30:00.000Z');
    const lapsedSubscription = new Subscription({
      id: 'sub_lapsed',
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

    jest
      .mocked(subscriptionRepo.findByClinicId)
      .mockResolvedValueOnce(lapsedSubscription);

    const lapsedBillingSnapshot = new SubscriptionBillingSnapshotService(
      subscriptionRepo,
      clinicOps,
      activationPolicy,
      {
        createInvoice: jest.fn(async () => null),
        listInvoicesByCustomer: jest.fn(async () => []),
      } as never,
      lapsedClock,
    );

    const lapsedUseCase = new ActivateSubscriptionUseCase(
      subscriptionRepo,
      new SubscriptionPricingService(),
      featureFlagService,
      checkoutPricing,
      configService,
      activationPolicy,
      lapsedBillingSnapshot,
      activationPayment,
      clinicSync,
    );

    await lapsedUseCase.execute(request);

    expect(subscriptionRepo.save).toHaveBeenCalled();
    const saved = jest.mocked(subscriptionRepo.save).mock
      .calls[0]?.[0] as Subscription;
    expect(saved.currentPeriodStart).toEqual(
      new Date('2026-05-18T00:00:00.000Z'),
    );
    expect(saved.currentPeriodEnd.getUTCMonth()).toBe(5);
    expect(saved.currentPeriodEnd.getUTCDate()).toBe(18);
    expect(subscriptionRepo.updatePaymentStatus).toHaveBeenCalledWith(
      'order_1',
      'paid',
      expect.objectContaining({ paymentId: 'pay_1' }),
    );
  });
});
