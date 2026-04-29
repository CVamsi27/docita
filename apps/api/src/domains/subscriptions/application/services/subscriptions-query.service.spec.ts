import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SubscriptionsQueryService } from './subscriptions-query.service';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import type { IClinicOperations } from '@/domains/subscriptions/application/ports/clinic-operations.port';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import { PricingService as BillingPricingService } from '@/domains/billing/core/services/pricing.service';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';

describe('SubscriptionsQueryService', () => {
  const findPaymentsByClinicIdMock =
    jest.fn<ISubscriptionRepository['findPaymentsByClinicId']>();

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
    findPaymentsByClinicId: findPaymentsByClinicIdMock,
    findPaymentById: jest.fn(async () => null),
    findPaymentByOrderId: jest.fn(async () => null),
    updatePaymentLink: jest.fn(async () => undefined),
    expireDuplicatePendingCheckouts: jest.fn(async () => 0),
    findReusablePendingCheckout: jest.fn(async () => null),
  };

  const clinicOps = {} as IClinicOperations;
  const billingPricingService = {
    getPricingConfig: jest.fn(async () => ({ tiers: [] })),
  } as unknown as BillingPricingService;
  const featureFlagService = {
    getClinicPricingOffer: jest.fn(async () => null),
  } as unknown as FeatureFlagService;

  let service: SubscriptionsQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubscriptionsQueryService(
      subscriptionRepo,
      clinicOps,
      new SubscriptionPricingService(),
      billingPricingService,
      featureFlagService,
    );
  });

  it('keeps receipts and only the newest pending checkout per plan amount', async () => {
    const now = new Date('2026-04-29T00:00:00.000Z');
    findPaymentsByClinicIdMock.mockResolvedValue([
      {
        id: 'pending-new',
        amountCents: 99900,
        currency: 'INR',
        status: 'pending',
        description: 'ESSENTIAL MONTHLY subscription',
        createdAt: now,
      },
      {
        id: 'pending-old',
        amountCents: 99900,
        currency: 'INR',
        status: 'pending',
        description: 'ESSENTIAL MONTHLY subscription',
        createdAt: new Date('2026-04-28T00:00:00.000Z'),
      },
      {
        id: 'paid',
        amountCents: 99900,
        currency: 'INR',
        status: 'paid',
        description: 'ESSENTIAL MONTHLY subscription',
        createdAt: new Date('2026-04-27T00:00:00.000Z'),
      },
      {
        id: 'expired',
        amountCents: 99900,
        currency: 'INR',
        status: 'expired',
        description: 'ESSENTIAL MONTHLY subscription',
        createdAt: new Date('2026-04-26T00:00:00.000Z'),
      },
    ]);

    const result = (await service.getPaymentHistory('clinic-1')).map(
      (payment) => (payment as unknown as { id: string }).id,
    );

    expect(result).toEqual(['pending-new', 'paid']);
    expect(findPaymentsByClinicIdMock).toHaveBeenCalledWith('clinic-1', 100);
  });
});
