import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import {
  TIER_PRICING_REPOSITORY_TOKEN,
  ITierPricingRepository,
} from '@/domains/billing/core/repositories/tier-pricing.repository';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { TIER_FEATURES } from '@workspace/types';

describe('PricingService', () => {
  let service: PricingService;
  let tierPricingRepo: ITierPricingRepository;

  beforeEach(async () => {
    const mockRepo = {
      findManyActive: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue([] as never),
    } as unknown as ITierPricingRepository;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: TIER_PRICING_REPOSITORY_TOKEN,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    tierPricingRepo = mockRepo;
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
      tierPricingRepo.findManyActive as jest.Mock<
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

  it('returns an error for invalid estimate tiers', () => {
    expect(service.calculateEstimate({ tier: 'INTELLIGENCE' })).toEqual({
      error: 'Invalid tier',
    });
  });


  it('returns the enterprise contact-sales estimate', () => {
    expect(
      service.calculateEstimate({
        tier: 'ENTERPRISE',
        currency: 'usd',
      }),
    ).toMatchObject({
      tier: 'ENTERPRISE',
      currency: {
        code: 'USD',
        symbol: '$',
      },
      basePrice: 'Contact Sales',
      totalMonthly: 'Contact Sales',
    });
  });

  it('applies yearly discount math to estimates', () => {
    const estimate = service.calculateEstimate({
      tier: 'ESSENTIAL',
      billingCycle: 'yearly',
      consultations: 500,
      users: 5,
    });

    expect(estimate).toMatchObject({
      tier: 'ESSENTIAL',
      billingCycle: 'yearly',
      breakdown: {
        discount: {
          percent: 17,
        },
      },
    });
    expect(estimate.totalMonthly).toBeLessThan(999);
  });

  it('applies semi-annual discount math to estimates', () => {
    const estimate = service.calculateEstimate({
      tier: 'PROFESSIONAL',
      billingCycle: 'semi_annual',
      appointments: 1_000,
      users: 3,
    });

    expect(estimate).toMatchObject({
      tier: 'PROFESSIONAL',
      billingCycle: 'semi_annual',
      breakdown: {
        discount: {
          percent: 8,
          amount: 199.92000000000002,
        },
      },
    });
  });

  it('includes WhatsApp message overages for paid clinical tiers', () => {
    const estimate = service.calculateEstimate({
      tier: 'PROFESSIONAL',
      currency: 'INR',
      consultations: 1_000,
      users: 3,
      whatsappMessages: 20_000,
    });

    if (!('breakdown' in estimate)) {
      throw new Error('Expected a priced estimate with a breakdown.');
    }
    const { breakdown } = estimate;
    if (!breakdown) {
      throw new Error('Expected estimate breakdown details.');
    }

    expect(estimate).toMatchObject({
      tier: 'PROFESSIONAL',
      breakdown: {
        overages: {
          whatsappMessages: {
            count: expect.any(Number),
            charge: expect.any(Number),
          },
        },
      },
    });
    expect(breakdown.overages.whatsappMessages.count).toBeGreaterThan(0);
    expect(breakdown.overages.whatsappMessages.charge).toBeGreaterThan(0);
  });
});
