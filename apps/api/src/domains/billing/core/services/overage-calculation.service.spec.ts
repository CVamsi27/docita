import { Test, TestingModule } from '@nestjs/testing';
import { OverageCalculationService } from './overage-calculation.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ClinicTier } from '@workspace/db';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('OverageCalculationService', () => {
  let service: OverageCalculationService;
  let prisma: {
    tierPricing: {
      findUnique: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
    clinicAddOn: {
      findMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
  };

  const mockTierPricing = {
    tier: 'PRO' as ClinicTier,
    overagePatientCents: 500,
    overageAppointmentCents: 200,
    overageUserCents: 10000,
  };

  const mockAddOns = [
    {
      id: 'addon-1',
      addOnType: 'WHATSAPP',
      status: 'ACTIVE',
      addOn: {
        overageRateByTier: JSON.stringify({ PRO: 50 }),
      },
    },
  ];

  const baseUsageData = {
    period: { start: new Date(), end: new Date() },
    usage: {
      activePatients: { current: 100, included: 200, overage: 0 },
      appointments: { current: 50, included: 100, overage: 0 },
      users: { current: 3, included: 5, overage: 0 },
      whatsappMessages: { current: 100, included: 200, overage: 0 },
      aiCredits: { current: 0, included: 0, overage: 0 },
    },
    tier: 'PRO' as ClinicTier,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OverageCalculationService,
        {
          provide: PrismaService,
          useValue: {
            tierPricing: {
              findUnique: jest
                .fn<(...args: unknown[]) => Promise<unknown>>()
                .mockResolvedValue(mockTierPricing),
            },
            clinicAddOn: {
              findMany: jest
                .fn<(...args: unknown[]) => Promise<unknown>>()
                .mockResolvedValue(mockAddOns),
            },
          },
        },
      ],
    }).compile();

    service = module.get<OverageCalculationService>(OverageCalculationService);
    prisma = module.get(PrismaService);
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

    it('should calculate patient overage correctly', async () => {
      const usageWithOverage = {
        ...baseUsageData,
        usage: {
          ...baseUsageData.usage,
          activePatients: { current: 250, included: 200, overage: 50 },
        },
      };

      const result = await service.calculateOverageCharges(
        'clinic-1',
        usageWithOverage,
      );

      expect(result.breakdown.activePatients).toBeDefined();
      expect(result.breakdown.activePatients.quantity).toBe(50);
      expect(result.breakdown.activePatients.rate).toBe(5);
      expect(result.breakdown.activePatients.charge).toBe(250);
      expect(result.totalOverageCharges).toBe(250);
    });

    it('should calculate multiple overages', async () => {
      const usageWithMultipleOverages = {
        ...baseUsageData,
        usage: {
          ...baseUsageData.usage,
          activePatients: { current: 250, included: 200, overage: 50 },
          appointments: { current: 120, included: 100, overage: 20 },
        },
      };

      const result = await service.calculateOverageCharges(
        'clinic-1',
        usageWithMultipleOverages,
      );

      expect(result.breakdown.activePatients).toBeDefined();
      expect(result.breakdown.appointments).toBeDefined();
      expect(result.totalOverageCharges).toBe(250 + 40);
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
      prisma.tierPricing.findUnique.mockResolvedValue(null);

      const usageWithOverage = {
        ...baseUsageData,
        usage: {
          ...baseUsageData.usage,
          activePatients: { current: 250, included: 200, overage: 50 },
        },
      };

      const result = await service.calculateOverageCharges(
        'clinic-1',
        usageWithOverage,
      );

      expect(result.breakdown.activePatients).toBeUndefined();
    });

    it('should return INR as currency', async () => {
      const result = await service.calculateOverageCharges(
        'clinic-1',
        baseUsageData,
      );
      expect(result.currency).toBe('INR');
    });

    it('should fetch data in parallel', async () => {
      await service.calculateOverageCharges('clinic-1', baseUsageData);

      expect(prisma.tierPricing.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.clinicAddOn.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
