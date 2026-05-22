import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SubscriptionsQueryService } from './subscriptions-query.service';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import type { IClinicOperations } from '@/domains/subscriptions/application/ports/clinic-operations.port';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import type { IClinicPricingQuery } from '@/domains/billing/application/ports';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import type { IPlatformInvoiceProvider } from '@/domains/payments/core/ports';
import type { IClock } from '@/shared/common/ports/clock.port';
import type { ApplyPlanChangeWithoutPaymentUseCase } from '@/domains/subscriptions/application/use-cases/apply-plan-change-without-payment.use-case';

describe('SubscriptionsQueryService', () => {
  const findPaymentsByClinicIdMock =
    jest.fn<ISubscriptionRepository['findPaymentsByClinicId']>();
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
    findPaymentsByClinicId: findPaymentsByClinicIdMock,
    findPaymentById: jest.fn(async () => null),
    findPaymentByOrderId: jest.fn(async () => null),
    updatePaymentLink: jest.fn(async () => undefined),
    expireDuplicatePendingCheckouts: jest.fn(async () => 0),
    expireOtherPendingSubscriptionCheckouts: jest.fn(async () => 0),
    findReusablePendingCheckout: jest.fn(async () => null),
  };

  const clinicOps = {
    getClinicDetails: jest.fn(async () => ({
      id: 'clinic-1',
      name: 'Clinic',
      email: 'c@x.com',
      phone: '+91',
      // No customer id -> mergeRazorpayInvoices short-circuits.
      razorpayCustomerId: undefined,
    })),
  } as unknown as IClinicOperations;
  const clinicPricingQuery = {
    getPricingConfig: jest.fn(async () => ({ tiers: [] })),
  } as unknown as IClinicPricingQuery;
  const featureFlagService = {
    getClinicPricingOffer: jest.fn(async () => null),
  } as unknown as FeatureFlagService;
  const platformInvoiceProvider = {
    listInvoicesByCustomer: jest.fn(async () => []),
    createInvoice: jest.fn(async () => null),
  } as unknown as IPlatformInvoiceProvider;
  const clock = {
    now: () => new Date('2026-04-29T00:00:00.000Z'),
  } as IClock;
  const applyPlanChangeWithoutPayment = {
    execute: jest.fn(async () => undefined),
  } as unknown as ApplyPlanChangeWithoutPaymentUseCase;

  let service: SubscriptionsQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    findByClinicIdMock.mockResolvedValue(null);
    service = new SubscriptionsQueryService(
      subscriptionRepo,
      clinicOps,
      new SubscriptionPricingService(),
      clinicPricingQuery,
      featureFlagService,
      platformInvoiceProvider,
      applyPlanChangeWithoutPayment,
      clock,
    );
  });

  it('keeps receipts and only the newest pending checkout per plan amount', async () => {
    findByClinicIdMock.mockResolvedValue({
      getPlan: () => ({ value: 'ESSENTIAL' }),
    } as never);
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

  it('keeps only the newest pending tier upgrade when several abandoned checkouts exist', async () => {
    findByClinicIdMock.mockResolvedValue({
      getPlan: () => ({ value: 'ESSENTIAL' }),
    } as never);
    findPaymentsByClinicIdMock.mockResolvedValue([
      {
        id: 'pending-essential',
        amountCents: 99900,
        currency: 'INR',
        status: 'pending',
        description: 'ESSENTIAL MONTHLY subscription',
        createdAt: new Date('2026-04-28T12:00:00.000Z'),
      },
      {
        id: 'pending-pro',
        amountCents: 249900,
        currency: 'INR',
        status: 'pending',
        description: 'PROFESSIONAL MONTHLY subscription',
        createdAt: new Date('2026-04-27T12:00:00.000Z'),
      },
    ]);

    const result = (await service.getPaymentHistory('clinic-1')).map(
      (payment) => (payment as unknown as { id: string }).id,
    );

    expect(result).toEqual(['pending-essential']);
  });

  it('keeps pending FRONT_DESK checkout rows when that plan is already active', async () => {
    findByClinicIdMock.mockResolvedValue({
      getPlan: () => ({ value: 'FRONT_DESK' }),
    } as never);
    findPaymentsByClinicIdMock.mockResolvedValue([
      {
        id: 'pending-front-desk',
        amountCents: 79900,
        currency: 'INR',
        status: 'pending',
        description: 'FRONT_DESK MONTHLY subscription',
        createdAt: new Date('2026-04-28T12:00:00.000Z'),
      },
    ]);

    const result = (await service.getPaymentHistory('clinic-1')).map(
      (payment) => (payment as unknown as { id: string }).id,
    );

    expect(result).toEqual(['pending-front-desk']);
  });

  it('hides pending upgrade checkouts that do not match the active subscription tier', async () => {
    findByClinicIdMock.mockResolvedValue({
      getPlan: () => ({ value: 'STARTER' }),
    } as never);
    findPaymentsByClinicIdMock.mockResolvedValue([
      {
        id: 'pending-essential',
        amountCents: 99900,
        currency: 'INR',
        status: 'pending',
        description: 'ESSENTIAL MONTHLY subscription',
        createdAt: new Date('2026-04-28T12:00:00.000Z'),
      },
    ]);

    const result = (await service.getPaymentHistory('clinic-1')).map(
      (payment) => (payment as unknown as { id: string }).id,
    );

    expect(result).toEqual([]);
  });

  it('sets hasOutstandingPendingPayment when a failed renewal row is still open', async () => {
    findByClinicIdMock.mockResolvedValue({
      id: 'sub-1',
      clinicId: 'clinic-1',
      getPlan: () => ({ value: 'ESSENTIAL' }),
      getBillingCycle: () => ({ value: 'MONTHLY' }),
      getStatus: () => ({ value: 'ACTIVE' }),
      getBasePrice: () => ({ paise: 99900 }),
      getDaysRemaining: () => 0,
      cancelAtPeriodEnd: false,
      currentPeriodStart: new Date('2026-03-17T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-04-17T23:59:59.999Z'),
      scheduledChange: null,
      getCredits: () => ({ paise: 0 }),
      isScheduledChangeDue: () => false,
    } as never);
    findPaymentsByClinicIdMock.mockResolvedValue([
      {
        id: 'paid-old',
        amountCents: 99900,
        currency: 'INR',
        status: 'paid',
        createdAt: new Date('2026-03-17T00:00:00.000Z'),
      },
      {
        id: 'failed-renewal',
        amountCents: 99900,
        currency: 'INR',
        status: 'failed',
        createdAt: new Date('2026-04-18T00:00:00.000Z'),
      },
    ]);

    const details = await service.getSubscriptionDetails('clinic-1');

    expect(details?.hasOutstandingPendingPayment).toBe(true);
    expect(details?.subscriptionStatus).toBe('ACTIVE');
  });
});
