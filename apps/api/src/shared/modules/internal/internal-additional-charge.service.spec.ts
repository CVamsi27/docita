import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { InternalAdditionalChargeService } from './internal-additional-charge.service';
import type { PrismaService } from '@/prisma/prisma.service';

describe('InternalAdditionalChargeService', () => {
  let service: InternalAdditionalChargeService;
  let prisma: {
    clinic: { findUnique: jest.Mock<(args: unknown) => Promise<unknown>> };
    subscription: { findFirst: jest.Mock<(args: unknown) => Promise<unknown>> };
  };
  let subscriptionRepository: {
    savePayment: jest.Mock<(payload: unknown) => Promise<unknown>>;
  };
  let clock: { now: jest.Mock };

  beforeEach(() => {
    prisma = {
      clinic: {
        findUnique: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
      },
    };
    subscriptionRepository = {
      savePayment: jest.fn(),
    };
    clock = { now: jest.fn(() => new Date('2026-08-10T00:00:00Z')) };
    service = new InternalAdditionalChargeService(
      prisma as unknown as PrismaService,
      subscriptionRepository as never,
      clock as never,
    );
  });

  it('records a charge and persists it via the subscription repository', async () => {
    prisma.clinic.findUnique.mockResolvedValueOnce({
      id: 'clinic-1',
      currency: 'INR',
    });
    prisma.subscription.findFirst.mockResolvedValueOnce({ id: 'sub-1' });
    subscriptionRepository.savePayment.mockResolvedValueOnce({});

    const result = await service.recordAdditionalCharge('clinic-1', {
      amount: 500,
      category: 'OTHER',
      paymentMethod: 'razorpay',
      notes: 'goodwill credit',
    });

    expect(result.success).toBe(true);
    expect(result.amount).toBe(500);
    expect(result.currency).toBe('INR');
    expect(subscriptionRepository.savePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic-1',
        subscriptionId: 'sub-1',
        amountCents: 50000,
        currency: 'INR',
        status: 'paid',
        paidAt: clock.now(),
      }),
    );
  });

  it('throws BadRequestException when the clinic does not exist', async () => {
    prisma.clinic.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.recordAdditionalCharge('missing', {
        amount: 100,
        category: 'OTHER',
        paymentMethod: 'manual',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(subscriptionRepository.savePayment).not.toHaveBeenCalled();
  });

  it('throws BadRequestException for invalid (non-positive) amounts', async () => {
    prisma.clinic.findUnique.mockResolvedValueOnce({
      id: 'clinic-1',
      currency: 'INR',
    });

    await expect(
      service.recordAdditionalCharge('clinic-1', {
        amount: 0,
        category: 'OTHER',
        paymentMethod: 'manual',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.recordAdditionalCharge('clinic-1', {
        amount: Number.NaN,
        category: 'OTHER',
        paymentMethod: 'manual',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(subscriptionRepository.savePayment).not.toHaveBeenCalled();
  });

  it('uses the clinic default currency when the request omits one', async () => {
    prisma.clinic.findUnique.mockResolvedValueOnce({
      id: 'clinic-2',
      currency: 'USD',
    });
    prisma.subscription.findFirst.mockResolvedValueOnce(null);
    subscriptionRepository.savePayment.mockResolvedValueOnce({});

    const result = await service.recordAdditionalCharge('clinic-2', {
      amount: 50,
      category: 'OTHER',
      paymentMethod: 'bank_transfer',
    });

    expect(result.currency).toBe('USD');
    expect(subscriptionRepository.savePayment).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'USD', subscriptionId: undefined }),
    );
  });
});
