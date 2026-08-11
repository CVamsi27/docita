import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SubscriptionPaymentTaxCalculator } from './subscription-payment-tax.calculator';
import { PrismaService } from '@/prisma/prisma.service';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('SubscriptionPaymentTaxCalculator', () => {
  const prismaMock: Record<string, Record<string, jest.Mock<AnyAsync>>> = {};

  let repository: SubscriptionPaymentTaxCalculator;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    for (const [key, value] of Object.entries(prismaMock)) {
      Object.defineProperty(prismaService, key, { value, writable: true });
    }
    repository = new SubscriptionPaymentTaxCalculator(
      prismaService as never,
      {} as never,
      {} as never,
    );
  });

  it('constructs without throwing', () => {
    expect(repository).toBeDefined();
  });
});
