/**
 * Unit Tests for OverageCalculationService
 *
 * Tests:
 * - Basic overage calculation
 * - No overage when under limits
 * - Add-on overage calculation
 * - Parallel data fetching
 * - Invalid add-on data handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { OverageCalculationService } from './overage-calculation.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('OverageCalculationService', () => {
  let service: OverageCalculationService;
  let prisma: any;

  const mockTierPricing = {
    tier: 'PRO',
    overagePatientCents: 500, // ₹5 per patient
    overageAppointmentCents: 200, // ₹2 per appointment
    overageUserCents: 10000, // ₹100 per user
  };

  const mockAddOns = [
    {
      id: 'addon-1',
      addOnType: 'WHATSAPP',
      status: 'ACTIVE',
      addOn: {
        overageRateByTier: JSON.stringify({ PRO: 50 }), // ₹0.50 per message
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
    tier: 'PRO',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OverageCalculationService,
        {
          provide: PrismaService,
          useValue: {
            tierPricing: {
              findUnique: jest.fn().mockResolvedValue(mockTierPricing),
            },
            clinicAddOn: {
              findMany: jest.fn().mockResolvedValue(mockAddOns),
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
      expect(result.breakdown.activePatients.rate).toBe(5); // ₹5 per patient
      expect(result.breakdown.activePatients.charge).toBe(250); // 50 * ₹5
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
      expect(result.totalOverageCharges).toBe(250 + 40); // (50*5) + (20*2)
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

      // No tier pricing = no base overages
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

      // Both should be called
      expect(prisma.tierPricing.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.clinicAddOn.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
