import { Test, TestingModule } from '@nestjs/testing';
import { OverageCalculationService } from './overage-calculation.service';
import {
  TIER_PRICING_REPOSITORY_TOKEN,
  ITierPricingRepository,
} from '@/domains/billing/core/repositories/tier-pricing.repository';
import { ClinicTier } from '@workspace/db';
import { TIER_OVERAGE_RATES_BY_CURRENCY } from '@workspace/types';
import { getWhatsAppAddonPricingByCurrency } from '@workspace/utils';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('OverageCalculationService', () => {
  let service: OverageCalculationService;
  let tierPricingRepo: ITierPricingRepository;

  const mockTierPricing = {
    tier: 'PROFESSIONAL' as ClinicTier,
    overageAppointmentCents: 200,
    overageUserCents: 10000,
  };

  const baseUsageData = {
    period: { start: new Date(), end: new Date() },
    usage: {
      consultations: { current: 50, included: 100, overage: 0 },
      users: { current: 3, included: 5, overage: 0 },
      whatsappMessages: { current: 100, included: 200, overage: 0 },
    },
    tier: 'PROFESSIONAL' as ClinicTier,
  };

  beforeEach(async () => {
    const mockRepo = {
      findByTier: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue(mockTierPricing as never),
      findManyActive: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue([] as never),
    } as unknown as ITierPricingRepository;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OverageCalculationService,
        {
          provide: TIER_PRICING_REPOSITORY_TOKEN,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<OverageCalculationService>(OverageCalculationService);
    tierPricingRepo = mockRepo;
  });

  describe('calculateOverageCharges', () => {
    it('should return zero charges when no overages', async () => {
      const result = await service.calculateOverageCharges(
        'clinic-1',
        baseUsageData,
      );

      expect(result.totalOverageCharges).toBe(0);
      expect(Object.keys(result.breakdown)).toHaveLength(0);
    });

    it('should calculate consultation overage correctly', async () => {
      const usageWithOverage = {
        ...baseUsageData,
        usage: {
          ...baseUsageData.usage,
          consultations: { current: 150, included: 100, overage: 50 },
        },
      };

      const result = await service.calculateOverageCharges(
        'clinic-1',
        usageWithOverage,
      );

      expect(result.breakdown.consultations).toBeDefined();
      expect(result.breakdown.consultations.quantity).toBe(50);
      expect(result.breakdown.consultations.rate).toBe(2);
      expect(result.breakdown.consultations.charge).toBe(100);
      expect(result.totalOverageCharges).toBe(100);
    });

    it('should calculate multiple overages', async () => {
      const usageWithMultipleOverages = {
        ...baseUsageData,
        usage: {
          ...baseUsageData.usage,
          consultations: { current: 150, included: 100, overage: 50 },
        },
      };

      const result = await service.calculateOverageCharges(
        'clinic-1',
        usageWithMultipleOverages,
      );

      expect(result.breakdown.consultations).toBeDefined();
      expect(result.totalOverageCharges).toBe(100);
    });

    it('should calculate WhatsApp overage', async () => {
      const usageWithWhatsapp = {
        ...baseUsageData,
        usage: {
          ...baseUsageData.usage,
          whatsappMessages: { current: 300, included: 200, overage: 100 },
        },
      };

      const result = await service.calculateOverageCharges(
        'clinic-1',
        usageWithWhatsapp,
      );

      expect(result.breakdown.whatsappMessages).toBeDefined();
      expect(result.breakdown.whatsappMessages.quantity).toBe(100);
    });

    it('should handle missing tier pricing gracefully', async () => {
      (
        tierPricingRepo.findByTier as jest.Mock<(...args: unknown[]) => unknown>
      ).mockResolvedValue(null as never);

      const usageWithOverage = {
        ...baseUsageData,
        usage: {
          ...baseUsageData.usage,
          consultations: { current: 150, included: 100, overage: 50 },
        },
      };

      const result = await service.calculateOverageCharges(
        'clinic-1',
        usageWithOverage,
      );

      expect(result.breakdown.consultations).toBeDefined();
    });

    it('should return INR as currency', async () => {
      const result = await service.calculateOverageCharges(
        'clinic-1',
        baseUsageData,
      );
      expect(result.currency).toBe('INR');
    });

    it('should calculate using requested non-INR currency rates', async () => {
      const usdRates = TIER_OVERAGE_RATES_BY_CURRENCY.USD.PROFESSIONAL;
      const usdWhatsapp = getWhatsAppAddonPricingByCurrency(
        'PROFESSIONAL',
        'USD',
      ).overageRate;
      const usageWithCurrency = {
        ...baseUsageData,
        currency: 'USD',
        usage: {
          consultations: { current: 510, included: 500, overage: 10 },
          users: { current: 7, included: 5, overage: 2 },
          whatsappMessages: { current: 620, included: 500, overage: 120 },
        },
      };

      const result = await service.calculateOverageCharges(
        'clinic-1',
        usageWithCurrency,
      );

      expect(result.currency).toBe('USD');
      expect(result.breakdown.consultations.rate).toBe(
        usdRates.appointmentRate,
      );
      expect(result.breakdown.users.rate).toBe(usdRates.userRate);
      expect(result.breakdown.whatsappMessages.rate).toBe(usdWhatsapp);
      expect(result.totalOverageCharges).toBeCloseTo(
        10 * usdRates.appointmentRate +
          2 * usdRates.userRate +
          120 * usdWhatsapp,
      );
    });

    it('should fetch tier pricing once per calculation', async () => {
      await service.calculateOverageCharges('clinic-1', baseUsageData);

      expect(tierPricingRepo.findByTier as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });
});
