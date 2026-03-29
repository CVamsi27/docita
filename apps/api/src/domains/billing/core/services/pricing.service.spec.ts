import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '@/prisma/prisma.service';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('PricingService', () => {
  let service: PricingService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PrismaService,
          useValue: {
            tierPricing: {
              findMany: jest
                .fn<(...args: unknown[]) => Promise<unknown>>()
                .mockResolvedValue([]),
            },
            addOn: {
              findMany: jest
                .fn<(...args: unknown[]) => Promise<unknown>>()
                .mockResolvedValue([]),
            },
            discount: {
              findMany: jest
                .fn<(...args: unknown[]) => Promise<unknown>>()
                .mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should return pricing with addOns removed and discounts exposed', async () => {
    const config = await service.getPricingConfig('INR');
    expect(Array.isArray(config.addOns)).toBe(true);
    expect(config.addOns).toHaveLength(0);
    expect(config).toHaveProperty('discounts');
    expect(config.discounts).toMatchObject({
      annualPercent: expect.any(Number),
      semiAnnualPercent: expect.any(Number),
      referralCredits: expect.any(Number),
    });
  });
});
