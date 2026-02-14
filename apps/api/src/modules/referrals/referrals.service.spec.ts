import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ReferralsService', () => {
  let service: ReferralsService;
  let prismaService: PrismaService;

  const mockClinic = {
    id: 'clinic-1',
    name: 'Test Clinic',
    email: 'test@clinic.com',
    referralCode: 'TEST123',
    referralCreditsMonths: 2,
  };

  const mockReferral = {
    id: 'referral-1',
    referrerClinicId: 'clinic-1',
    referredClinicId: 'clinic-2',
    referredEmail: 'referred@clinic.com',
    referredDomain: 'clinic.com',
    referralCode: 'TEST123',
    status: 'SIGNED_UP',
    discountPercent: 25,
    discountApplied: false,
    creditApplied: false,
    signedUpAt: new Date(),
    convertedAt: null,
    createdAt: new Date(),
    referrerClinic: mockClinic,
    referredClinic: {
      id: 'clinic-2',
      name: 'Referred Clinic',
      createdAt: new Date(),
    },
  };

  const mockPrismaService = {
    clinic: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    referral: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
    referralCredit: {
      create: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should inject PrismaService', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('getOrCreateReferralCode', () => {
    it('should return existing referral code', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);

      const result = await service.getOrCreateReferralCode('clinic-1');

      expect(result).toBe('TEST123');
      expect(mockPrismaService.clinic.update).not.toHaveBeenCalled();
    });

    it('should generate and save new code when none exists', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValue({
        ...mockClinic,
        referralCode: null,
      });
      mockPrismaService.clinic.update.mockResolvedValue({
        ...mockClinic,
        referralCode: 'TESTCL1234',
      });

      const result = await service.getOrCreateReferralCode('clinic-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.clinic.update).toHaveBeenCalledWith({
        where: { id: 'clinic-1' },
        data: { referralCode: expect.any(String) },
      });
    });

    it('should throw NotFoundException when clinic not found', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrCreateReferralCode('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getReferralLinkData', () => {
    it('should return formatted referral link data', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
      process.env.FRONTEND_URL = 'https://app.docita.in';

      const result = await service.getReferralLinkData('clinic-1');

      expect(result).toHaveProperty('code', 'TEST123');
      expect(result).toHaveProperty(
        'referralLink',
        'https://app.docita.in/signup?ref=TEST123',
      );
      expect(result).toHaveProperty('rewardDescription');
      expect(result).toHaveProperty('discountDescription');
    });

    it('should use default URL when FRONTEND_URL not set', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
      delete process.env.FRONTEND_URL;

      const result = await service.getReferralLinkData('clinic-1');

      expect(result.referralLink).toContain('https://app.docita.in');
    });
  });

  describe('applyReferralCode', () => {
    const referredClinic = {
      id: 'clinic-2',
      email: 'referred@clinic.com',
    };

    it('should successfully apply valid referral code', async () => {
      mockPrismaService.clinic.findFirst.mockResolvedValue(mockClinic);
      mockPrismaService.clinic.findUnique.mockResolvedValue(referredClinic);
      mockPrismaService.referral.findFirst.mockResolvedValue(null);
      mockPrismaService.referral.create.mockResolvedValue(mockReferral);

      const result = await service.applyReferralCode(
        'clinic-2',
        'TEST123',
        'referred@clinic.com',
      );

      expect(result.success).toBe(true);
      expect(result.discountPercent).toBe(25);
      expect(result.referrerClinicName).toBe('Test Clinic');
      expect(mockPrismaService.referral.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referrerClinicId: 'clinic-1',
          referredClinicId: 'clinic-2',
          referralCode: 'TEST123',
          status: 'SIGNED_UP',
          discountPercent: 25,
        }),
      });
    });

    it('should throw BadRequestException for invalid code', async () => {
      mockPrismaService.clinic.findFirst.mockResolvedValue(null);

      await expect(
        service.applyReferralCode('clinic-2', 'INVALID', 'test@email.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when using own code', async () => {
      mockPrismaService.clinic.findFirst.mockResolvedValue(mockClinic);
      mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);

      await expect(
        service.applyReferralCode('clinic-1', 'TEST123', 'test@email.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when clinic not found', async () => {
      mockPrismaService.clinic.findFirst.mockResolvedValue(mockClinic);
      mockPrismaService.clinic.findUnique.mockResolvedValue(null);

      await expect(
        service.applyReferralCode('clinic-2', 'TEST123', 'test@email.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already referred', async () => {
      mockPrismaService.clinic.findFirst.mockResolvedValue(mockClinic);
      mockPrismaService.clinic.findUnique.mockResolvedValue(referredClinic);
      mockPrismaService.referral.findFirst.mockResolvedValue(mockReferral);

      await expect(
        service.applyReferralCode('clinic-2', 'TEST123', 'test@email.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should extract domain from email', async () => {
      mockPrismaService.clinic.findFirst.mockResolvedValue(mockClinic);
      mockPrismaService.clinic.findUnique.mockResolvedValue(referredClinic);
      mockPrismaService.referral.findFirst.mockResolvedValue(null);
      mockPrismaService.referral.create.mockResolvedValue(mockReferral);

      await service.applyReferralCode(
        'clinic-2',
        'TEST123',
        'user@example.com',
      );

      expect(mockPrismaService.referral.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referredDomain: 'example.com',
        }),
      });
    });
  });

  describe('convertReferral', () => {
    it('should convert referral and credit referrer', async () => {
      mockPrismaService.referral.findFirst.mockResolvedValue({
        ...mockReferral,
        referrerClinic: { id: 'clinic-1', referralCreditsMonths: 2 },
      });
      mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}]);

      await service.convertReferral('clinic-2');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should not credit referrer when max credits reached', async () => {
      mockPrismaService.referral.findFirst.mockResolvedValue({
        ...mockReferral,
        referrerClinic: { id: 'clinic-1', referralCreditsMonths: 12 },
      });
      mockPrismaService.$transaction.mockResolvedValue([{}]);

      await service.convertReferral('clinic-2');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should return early when no pending referral found', async () => {
      mockPrismaService.referral.findFirst.mockResolvedValue(null);

      await service.convertReferral('clinic-2');

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getReferralDiscount', () => {
    it('should return discount for eligible clinic', async () => {
      mockPrismaService.referral.findFirst.mockResolvedValue(mockReferral);

      const result = await service.getReferralDiscount('clinic-2');

      expect(result.hasDiscount).toBe(true);
      expect(result.discountPercent).toBe(25);
      expect(result.referralCode).toBe('TEST123');
    });

    it('should return no discount when no referral found', async () => {
      mockPrismaService.referral.findFirst.mockResolvedValue(null);

      const result = await service.getReferralDiscount('clinic-2');

      expect(result.hasDiscount).toBe(false);
      expect(result.discountPercent).toBe(0);
    });
  });

  describe('getReferralStats', () => {
    it('should return comprehensive referral statistics', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
      mockPrismaService.referral.groupBy.mockResolvedValue([
        { status: 'SIGNED_UP', _count: { status: 2 } },
        { status: 'CONVERTED', _count: { status: 3 } },
      ]);
      mockPrismaService.referralCredit.aggregate.mockResolvedValue({
        _sum: { creditMonths: 5 },
      });

      const result = await service.getReferralStats('clinic-1');

      expect(result.totalReferrals).toBe(5);
      expect(result.pendingReferrals).toBe(2);
      expect(result.convertedReferrals).toBe(3);
      expect(result.totalCreditsEarned).toBe(5);
      expect(result.creditsRemaining).toBe(2);
    });

    it('should handle zero referrals', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValue({
        ...mockClinic,
        referralCreditsMonths: 0,
      });
      mockPrismaService.referral.groupBy.mockResolvedValue([]);
      mockPrismaService.referralCredit.aggregate.mockResolvedValue({
        _sum: { creditMonths: null },
      });

      const result = await service.getReferralStats('clinic-1');

      expect(result.totalReferrals).toBe(0);
      expect(result.pendingReferrals).toBe(0);
      expect(result.convertedReferrals).toBe(0);
      expect(result.totalCreditsEarned).toBe(0);
      expect(result.creditsRemaining).toBe(0);
    });
  });

  describe('getReferralHistory', () => {
    it('should return referral history with related clinics', async () => {
      mockPrismaService.referral.findMany.mockResolvedValue([mockReferral]);

      const result = await service.getReferralHistory('clinic-1');

      expect(mockPrismaService.referral.findMany).toHaveBeenCalledWith({
        where: { referrerClinicId: 'clinic-1' },
        include: {
          referredClinic: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockReferral]);
    });

    it('should return empty array for clinic with no referrals', async () => {
      mockPrismaService.referral.findMany.mockResolvedValue([]);

      const result = await service.getReferralHistory('clinic-1');

      expect(result).toEqual([]);
    });
  });

  describe('validateReferralCode', () => {
    it('should validate correct referral code', async () => {
      mockPrismaService.clinic.findFirst.mockResolvedValue(mockClinic);

      const result = await service.validateReferralCode('TEST123');

      expect(result.valid).toBe(true);
      expect(result.referrerName).toBe('Test Clinic');
      expect(result.discountPercent).toBe(25);
    });

    it('should reject invalid code', async () => {
      mockPrismaService.clinic.findFirst.mockResolvedValue(null);

      const result = await service.validateReferralCode('INVALID');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid referral code');
    });

    it('should reject when using own code', async () => {
      mockPrismaService.clinic.findFirst.mockResolvedValue(mockClinic);

      const result = await service.validateReferralCode('TEST123', 'clinic-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('You cannot use your own referral code');
    });

    it('should allow validation without clinicId', async () => {
      mockPrismaService.clinic.findFirst.mockResolvedValue(mockClinic);

      const result = await service.validateReferralCode('TEST123');

      expect(result.valid).toBe(true);
    });
  });

  describe('expireOldReferrals', () => {
    it('should expire referrals older than 90 days', async () => {
      mockPrismaService.referral.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.expireOldReferrals();

      expect(result).toBe(3);
      expect(mockPrismaService.referral.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          createdAt: { lt: expect.any(Date) },
        },
        data: { status: 'EXPIRED' },
      });
    });

    it('should return 0 when no old referrals', async () => {
      mockPrismaService.referral.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.expireOldReferrals();

      expect(result).toBe(0);
    });

    it('should only expire PENDING referrals', async () => {
      mockPrismaService.referral.updateMany.mockResolvedValue({ count: 2 });

      await service.expireOldReferrals();

      expect(mockPrismaService.referral.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'PENDING',
        }),
        data: { status: 'EXPIRED' },
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate database errors from getOrCreateReferralCode', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.clinic.findUnique.mockRejectedValue(error);

      await expect(
        service.getOrCreateReferralCode('clinic-1'),
      ).rejects.toThrow('Database connection failed');
    });

    it('should propagate database errors from getReferralStats', async () => {
      const error = new Error('Database error');
      mockPrismaService.clinic.findUnique.mockRejectedValue(error);

      await expect(service.getReferralStats('clinic-1')).rejects.toThrow(error);
    });
  });

  describe('Integration', () => {
    it('should complete full referral flow', async () => {
      // Step 1: Get referral link
      mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
      const linkData = await service.getReferralLinkData('clinic-1');
      expect(linkData.code).toBe('TEST123');

      // Step 2: Validate code
      mockPrismaService.clinic.findFirst.mockResolvedValue(mockClinic);
      const validation = await service.validateReferralCode('TEST123');
      expect(validation.valid).toBe(true);

      // Step 3: Apply code
      mockPrismaService.clinic.findUnique.mockResolvedValue({
        id: 'clinic-2',
        email: 'new@clinic.com',
      });
      mockPrismaService.referral.findFirst.mockResolvedValue(null);
      mockPrismaService.referral.create.mockResolvedValue(mockReferral);
      const applied = await service.applyReferralCode(
        'clinic-2',
        'TEST123',
        'new@clinic.com',
      );
      expect(applied.success).toBe(true);

      // Step 4: Get discount
      mockPrismaService.referral.findFirst.mockResolvedValue(mockReferral);
      const discount = await service.getReferralDiscount('clinic-2');
      expect(discount.hasDiscount).toBe(true);

      // Step 5: Convert referral
      mockPrismaService.referral.findFirst.mockResolvedValue({
        ...mockReferral,
        referrerClinic: { id: 'clinic-1', referralCreditsMonths: 2 },
      });
      mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}]);
      await service.convertReferral('clinic-2');

      // Step 6: Check stats
      mockPrismaService.clinic.findUnique.mockResolvedValue({
        ...mockClinic,
        referralCreditsMonths: 3,
      });
      mockPrismaService.referral.groupBy.mockResolvedValue([
        { status: 'CONVERTED', _count: { status: 1 } },
      ]);
      mockPrismaService.referralCredit.aggregate.mockResolvedValue({
        _sum: { creditMonths: 1 },
      });
      const stats = await service.getReferralStats('clinic-1');
      expect(stats.convertedReferrals).toBe(1);
    });
  });
});
