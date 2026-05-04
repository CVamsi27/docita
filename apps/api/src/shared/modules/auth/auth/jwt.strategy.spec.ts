import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { JwtStrategy, extractJwtFromRequest } from './jwt.strategy';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@workspace/db';
import type { Request } from 'express';
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
    emailVerified: boolean;
    onboardingStep:
      | 'NOT_STARTED'
      | 'CHOOSE_PATH'
      | 'CREATING_CLINIC'
      | 'JOINING_CLINIC'
      | 'COMPLETED';
  };

  const mockFindFirst = jest.fn() as jest.MockedFunction<
    () => Promise<MockUser | null>
  >;

  const mockPrisma = {
    runUnrestricted: jest.fn(
      async <T>(fn: () => Promise<T>): Promise<T> => fn(),
    ) as jest.MockedFunction<<T>(fn: () => Promise<T>) => Promise<T>>,
    user: {
      findFirst: mockFindFirst,
    },
  };

  const mockAppConfigService = {
    getJwtSecret: jest.fn(() => 'test-secret-key'),
    getJwtExpiration: jest.fn(() => '30d'),
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
    emailVerified: false,
    onboardingStep: 'CHOOSE_PATH' as const,
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
      mockFindFirst.mockResolvedValue(mockUser);

      const result = await strategy.validate(validPayload);

      expect(result).toEqual({
        id: 'user-123',
        sub: 'user-123',
        email: 'test@docita.work',
        role: 'ADMIN',
        name: 'Test Admin',
        clinicId: 'clinic-456',
        emailVerified: false,
        onboardingStep: 'CHOOSE_PATH',
        patientId: undefined,
      });
    });

    it('should query user profile from database', async () => {
      mockFindFirst.mockResolvedValue(mockUser);

      await strategy.validate(validPayload);

      expect(mockFindFirst).toHaveBeenCalledTimes(1);
      expect(prisma.runUnrestricted).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user lookup fails', async () => {
      mockFindFirst.mockRejectedValue(new Error('db unavailable'));

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should use clinicId from database user, not JWT payload', async () => {
      const userWithDifferentClinic = {
        ...mockUser,
        clinicId: 'different-clinic-id',
      };
      mockFindFirst.mockResolvedValue(userWithDifferentClinic);

      const result = await strategy.validate(validPayload);

      expect(result.clinicId).toBe('different-clinic-id');
    });

    it('should handle null clinicId for super admin users', async () => {
      const internal = { ...mockUser, clinicId: null, role: 'INTERNAL' };
      mockFindFirst.mockResolvedValue(internal);

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

  describe('extractJwtFromRequest', () => {
    it('prefers Authorization Bearer over access_token cookie', () => {
      const req = {
        headers: { authorization: 'Bearer bearer-token' },
        cookies: { access_token: 'cookie-token' },
      } as unknown as Request;

      expect(extractJwtFromRequest(req)).toBe('bearer-token');
    });

    it('falls back to access_token cookie when Bearer is absent', () => {
      const req = {
        headers: {},
        cookies: { access_token: 'cookie-token' },
      } as unknown as Request;

      expect(extractJwtFromRequest(req)).toBe('cookie-token');
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
