import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RazorpayOrderAdapter } from './razorpay-order.adapter';
import { RazorpayClientAdapter } from './razorpay-client.adapter';

describe('RazorpayOrderAdapter.capturePayment', () => {
  let adapter: RazorpayOrderAdapter;

  const mockRazorpay = {
    orders: {
      fetchPayments: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    payments: {
      capture: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
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

    adapter = new RazorpayOrderAdapter(razorpayClient, configService);
  });

  it('captures the first authorized payment for an order', async () => {
    mockRazorpay.orders.fetchPayments.mockResolvedValue({
      items: [
        {
          id: 'pay_auth_1',
          order_id: 'order_1',
          amount: 5000,
          currency: 'INR',
          status: 'authorized',
          method: 'card',
          captured: false,
          created_at: 1710000000,
          notes: { source: 'test' },
        },
      ],
    });

    mockRazorpay.payments.capture.mockResolvedValue({
      id: 'pay_auth_1',
      order_id: 'order_1',
      amount: 5000,
      currency: 'INR',
      status: 'captured',
      method: 'card',
      captured: true,
      created_at: 1710000000,
      notes: { source: 'test' },
    });

    const result = await adapter.capturePayment('order_1');

    expect(mockRazorpay.orders.fetchPayments).toHaveBeenCalledWith('order_1');
    expect(mockRazorpay.payments.capture).toHaveBeenCalledWith(
      'pay_auth_1',
      5000,
      'INR',
    );
    expect(result.id).toBe('pay_auth_1');
    expect(result.status).toBe('captured');
    expect(result.amount.toCents()).toBe(5000);
  });

  it('returns existing captured payment without re-capturing', async () => {
    mockRazorpay.orders.fetchPayments.mockResolvedValue({
      items: [
        {
          id: 'pay_cap_1',
          order_id: 'order_2',
          amount: 1250,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          captured: true,
          created_at: 1710000001,
          notes: {},
        },
      ],
    });

    const result = await adapter.capturePayment('order_2');

    expect(mockRazorpay.orders.fetchPayments).toHaveBeenCalledWith('order_2');
    expect(mockRazorpay.payments.capture).not.toHaveBeenCalled();
    expect(result.id).toBe('pay_cap_1');
    expect(result.status).toBe('captured');
  });

  it('throws when no payments exist for the order', async () => {
    mockRazorpay.orders.fetchPayments.mockResolvedValue({ items: [] });

    await expect(adapter.capturePayment('order_3')).rejects.toThrow(
      new BadRequestException('No payments found for the given order'),
    );
  });

  it('throws when no capturable payment exists', async () => {
    mockRazorpay.orders.fetchPayments.mockResolvedValue({
      items: [
        {
          id: 'pay_failed_1',
          order_id: 'order_4',
          amount: 700,
          currency: 'INR',
          status: 'failed',
          method: 'card',
          captured: false,
          created_at: 1710000002,
          notes: {},
        },
      ],
    });

    await expect(adapter.capturePayment('order_4')).rejects.toThrow(
      new BadRequestException(
        'No capturable payment found for the given order',
      ),
    );
  });

  it('wraps provider failures in BadRequestException', async () => {
    mockRazorpay.orders.fetchPayments.mockRejectedValue(
      new Error('provider down'),
    );

    await expect(adapter.capturePayment('order_5')).rejects.toThrow(
      new BadRequestException('Failed to capture payment'),
    );
  });

  it('bounds provider calls with a timeout', async () => {
    jest.useFakeTimers();
    try {
      mockRazorpay.orders.fetchPayments.mockImplementation(
        () => new Promise(() => undefined),
      );

      const capturePromise = adapter.capturePayment('order_timeout');
      const expectation = expect(capturePromise).rejects.toThrow(
        new BadRequestException('Failed to capture payment'),
      );
      await jest.advanceTimersByTimeAsync(5000);

      await expectation;
    } finally {
      jest.useRealTimers();
    }
  });
});
