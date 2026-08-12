import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InternalBillingService } from './internal-billing.service';

describe('InternalBillingService (facade)', () => {
  let service: InternalBillingService;
  let billingMetrics: {
    getMetrics: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  let subscriptionQuery: {
    getSubscriptions: jest.Mock<(args: unknown) => Promise<unknown>>;
    getExpiringSubscriptions: jest.Mock<(args: unknown) => Promise<unknown>>;
    getPayments: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  let subscriptionAdmin: {
    sendReminder: jest.Mock<(args: unknown) => Promise<unknown>>;
  };
  let pricingAdmin: {
    getPricingTiers: jest.Mock<() => Promise<unknown>>;
    getPricingOffers: jest.Mock<() => Promise<unknown>>;
  };
  let additionalCharge: {
    recordAdditionalCharge: jest.Mock<
      (args1: unknown, args2: unknown) => Promise<unknown>
    >;
  };

  beforeEach(() => {
    billingMetrics = { getMetrics: jest.fn() };
    subscriptionQuery = {
      getSubscriptions: jest.fn(),
      getExpiringSubscriptions: jest.fn(),
      getPayments: jest.fn(),
    };
    subscriptionAdmin = { sendReminder: jest.fn() };
    pricingAdmin = { getPricingTiers: jest.fn(), getPricingOffers: jest.fn() };
    additionalCharge = { recordAdditionalCharge: jest.fn() };
    service = new InternalBillingService(
      billingMetrics as never,
      subscriptionQuery as never,
      subscriptionAdmin as never,
      pricingAdmin as never,
      additionalCharge as never,
    );
  });

  it('delegates getMetrics to InternalBillingMetricsService', async () => {
    billingMetrics.getMetrics.mockResolvedValueOnce({ mrr: 100 });
    const result = await service.getMetrics();
    expect(result).toEqual({ mrr: 100 });
  });

  it('forwards subscription query filters to InternalSubscriptionQueryService', async () => {
    const filters = { status: 'ACTIVE' };
    subscriptionQuery.getSubscriptions.mockResolvedValueOnce({
      items: [],
      total: 0,
    });
    await service.getSubscriptions(filters as never);
    expect(subscriptionQuery.getSubscriptions).toHaveBeenCalledWith(filters);
  });

  it('forwards expiring window to InternalSubscriptionQueryService', async () => {
    subscriptionQuery.getExpiringSubscriptions.mockResolvedValueOnce([]);
    await service.getExpiringSubscriptions(7);
    expect(subscriptionQuery.getExpiringSubscriptions).toHaveBeenCalledWith(7);
  });

  it('forwards payments filters to InternalSubscriptionQueryService', async () => {
    const filters = { clinicId: 'clinic-1' };
    subscriptionQuery.getPayments.mockResolvedValueOnce({ items: [] });
    await service.getPayments(filters as never);
    expect(subscriptionQuery.getPayments).toHaveBeenCalledWith(filters);
  });

  it('delegates sendReminder to InternalSubscriptionAdminService', async () => {
    subscriptionAdmin.sendReminder.mockResolvedValueOnce({ success: true });
    await service.sendReminder('sub-1');
    expect(subscriptionAdmin.sendReminder).toHaveBeenCalledWith('sub-1');
  });

  it('forwards pricing queries to InternalPricingAdminService', async () => {
    pricingAdmin.getPricingTiers.mockResolvedValueOnce([]);
    pricingAdmin.getPricingOffers.mockResolvedValueOnce([]);
    await service.getPricingTiers();
    await service.getPricingOffers();
    expect(pricingAdmin.getPricingTiers).toHaveBeenCalled();
    expect(pricingAdmin.getPricingOffers).toHaveBeenCalled();
  });

  it('forwards additional charges to InternalAdditionalChargeService', async () => {
    additionalCharge.recordAdditionalCharge.mockResolvedValueOnce({
      success: true,
    });
    await service.recordAdditionalCharge('clinic-1', {
      amount: 100,
      category: 'OTHER',
      paymentMethod: 'manual',
    });
    expect(additionalCharge.recordAdditionalCharge).toHaveBeenCalledWith(
      'clinic-1',
      expect.objectContaining({ amount: 100 }),
    );
  });
});
