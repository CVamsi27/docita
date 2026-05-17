import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SubscriptionsQueryService } from './subscriptions-query.service';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import type { IClinicOperations } from '@/domains/subscriptions/application/ports/clinic-operations.port';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import { PricingService as BillingPricingService } from '@/domains/billing/core/services/pricing.service';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import type { RazorpayInvoiceAdapter } from '@/domains/payments/infrastructure/adapters/razorpay/razorpay-invoice.adapter';
import type { ActivateSubscriptionUseCase } from '@/domains/subscriptions/application/use-cases/activate-subscription.use-case';

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
    delete: jest.fn(async () => undefined),
    savePayment: jest.fn(async () => undefined),
    updatePaymentStatus: jest.fn(async () => undefined),
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
  const billingPricingService = {
    getPricingConfig: jest.fn(async () => ({ tiers: [] })),
  } as unknown as BillingPricingService;
  const featureFlagService = {
    getClinicPricingOffer: jest.fn(async () => null),
  } as unknown as FeatureFlagService;
  const razorpayInvoiceAdapter = {
    listInvoicesByCustomer: jest.fn(async () => []),
    createInvoice: jest.fn(async () => null),
  } as unknown as RazorpayInvoiceAdapter;
  const activateSubscriptionUseCase = {
    applyPlanChangeWithoutPayment: jest.fn(async () => undefined),
  } as unknown as ActivateSubscriptionUseCase;

  let service: SubscriptionsQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    findByClinicIdMock.mockResolvedValue(null);
    service = new SubscriptionsQueryService(
      subscriptionRepo,
      clinicOps,
      new SubscriptionPricingService(),
      billingPricingService,
      featureFlagService,
      razorpayInvoiceAdapter,
      activateSubscriptionUseCase,
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
});
