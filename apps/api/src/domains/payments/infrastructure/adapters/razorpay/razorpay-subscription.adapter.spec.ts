import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RazorpaySubscriptionAdapter } from './razorpay-subscription.adapter';
import { RazorpayClientAdapter } from './razorpay-client.adapter';
import { Money } from '@/domains/payments/core/value-objects/money.vo';
import { BillingInterval } from '@/domains/payments/core/entities/billing-interval.enum';

describe('RazorpaySubscriptionAdapter', () => {
  let adapter: RazorpaySubscriptionAdapter;

  const mockRazorpay = {
    customers: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetch: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      edit: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    plans: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetch: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    subscriptions: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      fetch: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      cancel: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      pause: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      resume: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const configService = Object.create(
      ConfigService.prototype,
    ) as ConfigService;
    configService.get = ((propertyPath: string) => {
      if (propertyPath === 'RAZORPAY_KEY_ID') return 'rzp_test_key';
      if (propertyPath === 'RAZORPAY_KEY_SECRET') return 'rzp_test_secret';
      return undefined;
    }) as ConfigService['get'];

    const razorpayClient = new RazorpayClientAdapter(configService);
    Reflect.set(razorpayClient, 'razorpay', mockRazorpay);

    adapter = new RazorpaySubscriptionAdapter(razorpayClient);
  });

  describe('createCustomer', () => {
    it('maps the provider customer, coercing a numeric contact to string', async () => {
      mockRazorpay.customers.create.mockResolvedValue({
        id: 'cust_1',
        name: 'Dr Rao',
        email: 'rao@clinic.test',
        contact: 919812345678,
        notes: { clinicId: 'clinic_1' },
      });

      const result = await adapter.createCustomer({
        name: 'Dr Rao',
        email: 'rao@clinic.test',
        phone: '919812345678',
        metadata: { clinicId: 'clinic_1' },
      });

      expect(result.id).toBe('cust_1');
      expect(result.phone).toBe('919812345678');
      expect(result.metadata).toEqual({ clinicId: 'clinic_1' });
    });

    it('wraps provider failures in BadRequestException', async () => {
      mockRazorpay.customers.create.mockRejectedValue(new Error('boom'));
      await expect(
        adapter.createCustomer({ name: 'x', email: 'x@y.z' }),
      ).rejects.toThrow(new BadRequestException('Failed to create customer'));
    });
  });

  describe('getCustomer', () => {
    it('returns null when the customer is missing', async () => {
      mockRazorpay.customers.fetch.mockRejectedValue(new Error('404'));
      await expect(adapter.getCustomer('cust_missing')).resolves.toBeNull();
    });
  });

  describe('createPlan', () => {
    it('sends the amount in cents with currency and returns the plan id', async () => {
      mockRazorpay.plans.create.mockResolvedValue({ id: 'plan_1' });

      const result = await adapter.createPlan({
        name: 'Pro monthly',
        interval: BillingInterval.MONTHLY,
        amount: Money.fromCents(49900, 'INR'),
        description: 'Pro tier',
      });

      expect(mockRazorpay.plans.create).toHaveBeenCalledWith(
        expect.objectContaining({
          period: 'monthly',
          interval: 1,
          item: expect.objectContaining({
            amount: 49900,
            currency: 'INR',
          }),
        }),
      );
      expect(result.planId).toBe('plan_1');
    });
  });

  describe('createSubscription', () => {
    it('maps period timestamps to Date and preserves notes as metadata', async () => {
      mockRazorpay.subscriptions.create.mockResolvedValue({
        id: 'sub_1',
        customer_id: 'cust_1',
        plan_id: 'plan_1',
        status: 'active',
        current_start: 1710000000,
        current_end: 1712592000,
        notes: { clinicId: 'clinic_1' },
      });

      const result = await adapter.createSubscription({
        planId: 'plan_1',
        customerId: 'cust_1',
      });

      expect(result.id).toBe('sub_1');
      expect(result.status).toBe('active');
      expect(result.currentPeriodStart).toEqual(new Date(1710000000 * 1000));
      expect(result.currentPeriodEnd).toEqual(new Date(1712592000 * 1000));
      expect(result.metadata).toEqual({ clinicId: 'clinic_1' });
    });

    it('throws BadRequestException on a non-object provider response', async () => {
      mockRazorpay.subscriptions.create.mockResolvedValue(null);
      await expect(
        adapter.createSubscription({ planId: 'p', customerId: 'c' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSubscription', () => {
    it('returns null when the subscription is missing', async () => {
      mockRazorpay.subscriptions.fetch.mockRejectedValue(new Error('404'));
      await expect(adapter.getSubscription('sub_missing')).resolves.toBeNull();
    });
  });

  describe('cancelSubscription', () => {
    it('passes cancelAtPeriodEnd=false as 0 to the provider', async () => {
      mockRazorpay.subscriptions.cancel.mockResolvedValue({});
      await adapter.cancelSubscription('sub_1');
      expect(mockRazorpay.subscriptions.cancel).toHaveBeenCalledWith(
        'sub_1',
        0,
      );
    });

    it('passes cancelAtPeriodEnd=true as 1 to the provider', async () => {
      mockRazorpay.subscriptions.cancel.mockResolvedValue({});
      await adapter.cancelSubscription('sub_1', true);
      expect(mockRazorpay.subscriptions.cancel).toHaveBeenCalledWith(
        'sub_1',
        1,
      );
    });

    it('wraps provider failures in BadRequestException', async () => {
      mockRazorpay.subscriptions.cancel.mockRejectedValue(new Error('boom'));
      await expect(adapter.cancelSubscription('sub_1')).rejects.toThrow(
        new BadRequestException('Failed to cancel subscription'),
      );
    });
  });

  describe('pause/resume', () => {
    it('pauses via the provider', async () => {
      mockRazorpay.subscriptions.pause.mockResolvedValue({});
      await adapter.pauseSubscription('sub_1');
      expect(mockRazorpay.subscriptions.pause).toHaveBeenCalledWith('sub_1');
    });

    it('resumes via the provider', async () => {
      mockRazorpay.subscriptions.resume.mockResolvedValue({});
      await adapter.resumeSubscription('sub_1');
      expect(mockRazorpay.subscriptions.resume).toHaveBeenCalledWith('sub_1');
    });

    it('wraps a resume failure in BadRequestException', async () => {
      mockRazorpay.subscriptions.resume.mockRejectedValue(new Error('boom'));
      await expect(adapter.resumeSubscription('sub_1')).rejects.toThrow(
        new BadRequestException('Failed to resume subscription'),
      );
    });
  });
});
