import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RazorpayRefundAdapter } from './razorpay-refund.adapter';
import { RazorpayClientAdapter } from './razorpay-client.adapter';
import { RefundStatus } from '@/domains/payments/core/entities/refund-status.enum';
import { Money } from '@/domains/payments/core/value-objects/money.vo';

describe('RazorpayRefundAdapter', () => {
  let adapter: RazorpayRefundAdapter;

  const mockRazorpay = {
    payments: {
      refund: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    refunds: {
      fetch: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
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

    adapter = new RazorpayRefundAdapter(razorpayClient);
  });

  describe('createRefund', () => {
    it('issues a partial refund with the amount in cents and maps the response', async () => {
      mockRazorpay.payments.refund.mockResolvedValue({
        id: 'rfnd_1',
        amount: 2500,
        currency: 'INR',
        status: 'processed',
        created_at: 1710000000,
      });

      const result = await adapter.createRefund({
        paymentId: 'pay_1',
        amount: Money.fromCents(2500),
        reason: 'duplicate',
        metadata: { ticket: 'T-9' },
      });

      expect(mockRazorpay.payments.refund).toHaveBeenCalledWith('pay_1', {
        amount: 2500,
        notes: { ticket: 'T-9', reason: 'duplicate' },
      });
      expect(result.refundId).toBe('rfnd_1');
      expect(result.amount.toCents()).toBe(2500);
      expect(result.status).toBe(RefundStatus.SUCCEEDED);
      expect(result.createdAt).toEqual(new Date(1710000000 * 1000));
    });

    it('omits the amount for a full refund', async () => {
      mockRazorpay.payments.refund.mockResolvedValue({
        id: 'rfnd_full',
        amount: 9900,
        currency: 'INR',
        status: 'pending',
        created_at: 1710000001,
      });

      await adapter.createRefund({ paymentId: 'pay_2' });

      expect(mockRazorpay.payments.refund).toHaveBeenCalledWith('pay_2', {
        notes: {},
      });
    });

    it.each([
      ['pending', RefundStatus.PENDING],
      ['processing', RefundStatus.PROCESSING],
      ['processed', RefundStatus.SUCCEEDED],
      ['failed', RefundStatus.FAILED],
      ['unknown_status', RefundStatus.PENDING],
    ])('maps provider status %s to %s', async (providerStatus, expected) => {
      mockRazorpay.payments.refund.mockResolvedValue({
        id: 'rfnd_x',
        amount: 100,
        currency: 'INR',
        status: providerStatus,
        created_at: 1710000002,
      });

      const result = await adapter.createRefund({ paymentId: 'pay_x' });
      expect(result.status).toBe(expected);
    });

    it('wraps provider failures in BadRequestException', async () => {
      mockRazorpay.payments.refund.mockRejectedValue(new Error('gateway 500'));

      await expect(
        adapter.createRefund({ paymentId: 'pay_err' }),
      ).rejects.toThrow(new BadRequestException('Failed to create refund'));
    });

    it('defaults a missing refund amount to zero cents', async () => {
      mockRazorpay.payments.refund.mockResolvedValue({
        id: 'rfnd_noamt',
        currency: 'INR',
        status: 'processed',
        created_at: 1710000003,
      });

      const result = await adapter.createRefund({ paymentId: 'pay_noamt' });
      expect(result.amount.toCents()).toBe(0);
    });
  });

  describe('getRefund', () => {
    it('returns the mapped refund when found', async () => {
      mockRazorpay.refunds.fetch.mockResolvedValue({
        id: 'rfnd_get',
        amount: 500,
        currency: 'INR',
        status: 'processed',
        created_at: 1710000004,
      });

      const result = await adapter.getRefund('rfnd_get');
      expect(result?.refundId).toBe('rfnd_get');
      expect(result?.status).toBe(RefundStatus.SUCCEEDED);
    });

    it('returns null (not throw) when the refund is missing', async () => {
      mockRazorpay.refunds.fetch.mockRejectedValue(new Error('not found'));
      await expect(adapter.getRefund('rfnd_missing')).resolves.toBeNull();
    });
  });
});
