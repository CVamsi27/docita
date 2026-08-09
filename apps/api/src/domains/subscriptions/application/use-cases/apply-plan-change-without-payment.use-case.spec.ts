import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ApplyPlanChangeWithoutPaymentUseCase } from './apply-plan-change-without-payment.use-case';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import { SubscriptionCheckoutPricingService } from '@/domains/subscriptions/application/services/subscription-checkout-pricing.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { SubscriptionActivationPolicyService } from '@/domains/subscriptions/application/services/subscription-activation-policy.service';
import { SubscriptionBillingSnapshotService } from '@/domains/subscriptions/application/services/subscription-billing-snapshot.service';
import { ActivateSubscriptionClinicSyncService } from '@/domains/subscriptions/application/services/activate-subscription-clinic-sync.service';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import {
  BillingCycle,
  ClinicTier,
  SubscriptionStatus,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects';

function buildSubscription(): Subscription {
  return new Subscription({
    id: 'sub-1',
    clinicId: 'clinic-1',
    plan: ClinicTier.fromString('ESSENTIAL'),
    billingCycle: BillingCycle.fromString('MONTHLY'),
    basePriceCents: 99900,
    status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
    currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
    autoPayEnabled: true,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    version: 1,
  });
}

describe('ApplyPlanChangeWithoutPaymentUseCase', () => {
  const findByClinicIdMock =
    jest.fn<ISubscriptionRepository['findByClinicId']>();
  const subscriptionRepo: ISubscriptionRepository = {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => null),
    findByClinicId: findByClinicIdMock,
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
    findPaymentByOrderId: jest.fn(async () => null),
    updatePaymentLink: jest.fn(async () => undefined),
    expireDuplicatePendingCheckouts: jest.fn(async () => 0),
    expireOtherPendingSubscriptionCheckouts: jest.fn(async () => 0),
    findReusablePendingCheckout: jest.fn(async () => null),
    findPaymentByRazorpayPaymentId: jest.fn(async () => null),
  };

  const calculatePriceMock =
    jest.fn<SubscriptionPricingService['calculatePrice']>();
  const pricingService = Object.create(
    SubscriptionPricingService.prototype,
  ) as SubscriptionPricingService;
  pricingService.calculatePrice = calculatePriceMock;

  const getClinicPricingOfferMock =
    jest.fn<FeatureFlagService['getClinicPricingOffer']>();
  const featureFlagService = {
    getClinicPricingOffer: getClinicPricingOfferMock,
  } as unknown as FeatureFlagService;

  const computeMock =
    jest.fn<SubscriptionCheckoutPricingService['compute']>();
  const checkoutPricing = Object.create(
    SubscriptionCheckoutPricingService.prototype,
  ) as SubscriptionCheckoutPricingService;
  checkoutPricing.compute = computeMock;

  const getCurrencyCodeMock = jest
    .fn<AppConfigService['getCurrencyCode']>()
    .mockReturnValue('INR');
  const configService = {
    getCurrencyCode: getCurrencyCodeMock,
  } as unknown as AppConfigService;

  const activationPolicy = Object.create(
    SubscriptionActivationPolicyService.prototype,
  ) as SubscriptionActivationPolicyService;
  const shouldPreserveMock =
    jest.fn<SubscriptionActivationPolicyService['shouldPreserveCurrentPeriodEnd']>();
  activationPolicy.shouldPreserveCurrentPeriodEnd = shouldPreserveMock;

  const persistActivatedSubscriptionMock =
    jest.fn<SubscriptionBillingSnapshotService['persistActivatedSubscription']>();
  const billingSnapshot = Object.create(
    SubscriptionBillingSnapshotService.prototype,
  ) as SubscriptionBillingSnapshotService;
  billingSnapshot.persistActivatedSubscription =
    persistActivatedSubscriptionMock;

  const syncAfterActivationMock =
    jest.fn<ActivateSubscriptionClinicSyncService['syncAfterActivation']>();
  const clinicSync = Object.create(
    ActivateSubscriptionClinicSyncService.prototype,
  ) as ActivateSubscriptionClinicSyncService;
  clinicSync.syncAfterActivation = syncAfterActivationMock;

  let useCase: ApplyPlanChangeWithoutPaymentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ApplyPlanChangeWithoutPaymentUseCase(
      subscriptionRepo,
      pricingService,
      featureFlagService,
      checkoutPricing,
      configService,
      activationPolicy,
      billingSnapshot,
      clinicSync,
    );
    getClinicPricingOfferMock.mockResolvedValue(null);
    shouldPreserveMock.mockReturnValue(false);
    persistActivatedSubscriptionMock.mockResolvedValue(
      buildSubscription(),
    );
    syncAfterActivationMock.mockResolvedValue(undefined);
  });

  it('throws BadRequestException when the payable amount is non-zero', async () => {
    findByClinicIdMock.mockResolvedValue(buildSubscription());
    computeMock.mockReturnValue({
      currentTier: 'ESSENTIAL',
      currentCycle: 'MONTHLY',
      newTier: 'PROFESSIONAL',
      newCycle: 'MONTHLY',
      creditCents: 0,
      chargeCents: 199900,
      daysRemaining: 20,
      totalCycleDays: 30,
      proratedCreditCents: 0,
      proratedChargeCents: 0,
      finalAmountCents: 199900,
      accountCreditsAppliedCents: 0,
      surplusCreditCents: 0,
    } as never);

    await expect(
      useCase.execute({
        clinicId: 'clinic-1',
        tier: 'PROFESSIONAL',
        cycle: 'MONTHLY',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(persistActivatedSubscriptionMock).not.toHaveBeenCalled();
    expect(syncAfterActivationMock).not.toHaveBeenCalled();
  });

  it('applies a zero-payable plan change through the snapshot and clinic sync chain', async () => {
    findByClinicIdMock.mockResolvedValue(buildSubscription());
    computeMock.mockReturnValue({
      currentTier: 'ESSENTIAL',
      currentCycle: 'MONTHLY',
      newTier: 'ESSENTIAL',
      newCycle: 'MONTHLY',
      creditCents: 99900,
      chargeCents: 99900,
      daysRemaining: 20,
      totalCycleDays: 30,
      proratedCreditCents: 66600,
      proratedChargeCents: 66600,
      finalAmountCents: 0,
      accountCreditsAppliedCents: 66600,
      surplusCreditCents: 0,
    } as never);
    calculatePriceMock.mockReturnValue(99900);

    await useCase.execute({
      clinicId: 'clinic-1',
      tier: 'ESSENTIAL',
      cycle: 'MONTHLY',
      planMode: 'FULL',
    });

    expect(persistActivatedSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic-1',
        tier: expect.objectContaining({ value: 'ESSENTIAL' }),
        cycle: expect.objectContaining({ value: 'MONTHLY' }),
        listPriceCents: 99900,
        creditsConsumed: 66600,
        preserveCurrentPeriodEnd: false,
        surplusCreditCents: 0,
      }),
    );
    expect(syncAfterActivationMock).toHaveBeenCalledWith(
      'clinic-1',
      expect.objectContaining({ value: 'ESSENTIAL' }),
      'FULL',
    );
  });

  it('passes the clinic offer discount percent into pricing and checkout', async () => {
    findByClinicIdMock.mockResolvedValue(buildSubscription());
    getClinicPricingOfferMock.mockResolvedValue({
      title: 'Launch discount',
      description: '20% off',
      percentOff: 20,
    });
    computeMock.mockReturnValue({
      currentTier: 'ESSENTIAL',
      currentCycle: 'MONTHLY',
      newTier: 'ESSENTIAL',
      newCycle: 'MONTHLY',
      creditCents: 0,
      chargeCents: 79920,
      daysRemaining: 20,
      totalCycleDays: 30,
      proratedCreditCents: 0,
      proratedChargeCents: 0,
      finalAmountCents: 0,
      accountCreditsAppliedCents: 0,
      surplusCreditCents: 0,
    } as never);
    calculatePriceMock.mockReturnValue(79920);

    await useCase.execute({
      clinicId: 'clinic-1',
      tier: 'ESSENTIAL',
      cycle: 'MONTHLY',
    });

    expect(computeMock).toHaveBeenCalledWith(
      expect.any(Subscription),
      expect.objectContaining({ value: 'ESSENTIAL' }),
      expect.objectContaining({ value: 'MONTHLY' }),
      20,
    );
    expect(calculatePriceMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'ESSENTIAL' }),
      expect.objectContaining({ value: 'MONTHLY' }),
      20,
    );
  });
});
