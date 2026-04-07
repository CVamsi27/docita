import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@workspace/db';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: typeof mockPrisma;

  type MockUser = {
    id: string;
    email: string;
    role: string;
    name: string;
    clinicId: string | null;
  };

  const mockPrisma = {
    $queryRaw: jest.fn() as jest.MockedFunction<
      (...args: unknown[]) => Promise<MockUser[]>
    >,
  };

  const mockAppConfigService = {
    getJwtSecret: jest.fn(() => 'test-secret-key'),
    getJwtExpiration: jest.fn(() => '7d'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AppConfigService, useValue: mockAppConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prisma = mockPrisma;
  });

  const validPayload = {
    sub: 'user-123',
    email: 'test@docita.work',
    role: 'ADMIN' as Role,
    name: 'Test Admin',
    clinicId: 'clinic-456',
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@docita.work',
    role: 'ADMIN',
    name: 'Test Admin',
    clinicId: 'clinic-456',
  };

  describe('validate', () => {
    it('should throw UnauthorizedException when payload subject is missing', async () => {
      await expect(
        strategy.validate({
          ...validPayload,
          sub: '',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user data when valid payload is provided', async () => {
      prisma.$queryRaw.mockResolvedValue([mockUser]);

      const result = await strategy.validate(validPayload);

      expect(result).toEqual({
        id: 'user-123',
        sub: 'user-123',
        email: 'test@docita.work',
        role: 'ADMIN',
        name: 'Test Admin',
        clinicId: 'clinic-456',
        patientId: undefined,
      });
    });

    it('should query user profile from database', async () => {
      prisma.$queryRaw.mockResolvedValue([mockUser]);

      await strategy.validate(validPayload);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user lookup fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('db unavailable'));

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should use clinicId from database user, not JWT payload', async () => {
      const userWithDifferentClinic = {
        ...mockUser,
        clinicId: 'different-clinic-id',
      };
      prisma.$queryRaw.mockResolvedValue([userWithDifferentClinic]);

      const result = await strategy.validate(validPayload);

      expect(result.clinicId).toBe('different-clinic-id');
    });

    it('should handle null clinicId for super admin users', async () => {
      const internal = { ...mockUser, clinicId: null, role: 'INTERNAL' };
      prisma.$queryRaw.mockResolvedValue([internal]);

      const payloadForInternal = {
        ...validPayload,
        role: 'INTERNAL' as Role,
        clinicId: null,
      };

      const result = await strategy.validate(payloadForInternal);

      expect(result.clinicId).toBeNull();
      expect(result.role).toBe('INTERNAL');
    });
  });

  describe('constructor', () => {
    it('should throw if JWT_SECRET is not set', async () => {
      const noSecretConfig = {
        getJwtSecret: jest.fn(() => undefined),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            JwtStrategy,
            { provide: PrismaService, useValue: mockPrisma },
            { provide: AppConfigService, useValue: noSecretConfig },
          ],
        }).compile(),
      ).rejects.toThrow('CRITICAL: JWT_SECRET is not set');
    });
  });
});
