import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClinicTier } from '@workspace/db';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prismaService: PrismaService;

  const mockClinic = {
    id: 'clinic-123',
    name: 'Test Clinic',
    tier: 'CORE',
    intelligenceAddon: 'NONE',
    subscriptionStatus: 'active',
    trialEndsAt: null,
    features: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: PrismaService,
          useValue: {
            clinic: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSubscription', () => {
    it('should throw BadRequestException if clinicId is missing', async () => {
      await expect(service.getSubscription(null as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getSubscription('')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getSubscription(undefined as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return subscription details if found', async () => {
      jest
        .spyOn(prismaService.clinic, 'findUnique')
        .mockResolvedValue(mockClinic as any);

      const result = await service.getSubscription('clinic-123');
      expect(result).toBeDefined();
      expect(result.id).toBe('clinic-123');
      expect(prismaService.clinic.findUnique).toHaveBeenCalledWith({
        where: { id: 'clinic-123' },
        select: expect.any(Object),
      });
    });
  });
});
