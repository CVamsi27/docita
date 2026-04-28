import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '@/prisma/prisma.service';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { TIER_FEATURES } from '@workspace/types';

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

  it('should return pricing with discounts exposed', async () => {
    const config = await service.getPricingConfig('INR');
    expect(config).toHaveProperty('discounts');
    expect(config.discounts).toMatchObject({
      annualPercent: expect.any(Number),
      semiAnnualPercent: expect.any(Number),
      referralCredits: expect.any(Number),
    });
  });

  it('uses shared tier feature promises for fallback pricing config', async () => {
    const config = await service.getPricingConfig('INR');

    for (const tier of config.tiers) {
      expect(tier.features).toEqual(TIER_FEATURES[tier.id]);
    }
  });

  it('should treat enterprise pricing as custom when DB tier rows are present', async () => {
    (
      prismaService.tierPricing.findMany as jest.Mock<
        (...args: unknown[]) => Promise<unknown>
      >
    ).mockResolvedValue([
      {
        tier: 'CORE',
        monthlyBasePriceCents: 99900,
        includedAppointments: 500,
        includedUsers: 5,
        overageAppointmentCents: 1200,
        overageUserCents: 25000,
        features: [],
      },
      {
        tier: 'ENTERPRISE',
        monthlyBasePriceCents: 0,
        includedAppointments: 999999,
        includedUsers: 999,
        overageAppointmentCents: 0,
        overageUserCents: 0,
        features: [],
      },
    ]);

    const config = await service.getPricingConfig('INR');
    const enterprise = config.tiers.find((tier) => tier.id === 'ENTERPRISE');

    expect(enterprise).toBeDefined();
    expect(enterprise?.pricing.monthly).toBe('custom');
    expect(enterprise?.pricing.yearly).toBe('custom');
  });
});
