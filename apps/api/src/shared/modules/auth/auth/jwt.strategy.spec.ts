import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { JwtStrategy, extractJwtFromRequest } from './jwt.strategy';
import { Role } from '@workspace/db';
import type { Request } from 'express';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { USER_REPOSITORY_TOKEN } from '@/domains/users/core/repositories/user.repository.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  type MockUser = {
    id: string;
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

  const mockFindByIdForJwtValidation = jest.fn() as jest.MockedFunction<
    (id: string) => Promise<MockUser | null>
  >;

  const mockUserRepository = {
    findByIdForJwtValidation: mockFindByIdForJwtValidation,
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
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: mockUserRepository,
        },
        { provide: AppConfigService, useValue: mockAppConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
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
      mockFindByIdForJwtValidation.mockResolvedValue(mockUser);

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
      mockFindByIdForJwtValidation.mockResolvedValue(mockUser);

      await strategy.validate(validPayload);

      expect(mockFindByIdForJwtValidation).toHaveBeenCalledTimes(1);
      expect(mockFindByIdForJwtValidation).toHaveBeenCalledWith('user-123');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockFindByIdForJwtValidation.mockResolvedValue(null);

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user lookup fails', async () => {
      mockFindByIdForJwtValidation.mockRejectedValue(
        new Error('db unavailable'),
      );

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should use clinicId from database user, not JWT payload', async () => {
      const userWithDifferentClinic = {
        ...mockUser,
        clinicId: 'different-clinic-id',
      };
      mockFindByIdForJwtValidation.mockResolvedValue(userWithDifferentClinic);

      const result = await strategy.validate(validPayload);

      expect(result.clinicId).toBe('different-clinic-id');
    });

    it('should handle null clinicId for super admin users', async () => {
      const internal = { ...mockUser, clinicId: null };
      mockFindByIdForJwtValidation.mockResolvedValue(internal);

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
            {
              provide: USER_REPOSITORY_TOKEN,
              useValue: mockUserRepository,
            },
            { provide: AppConfigService, useValue: noSecretConfig },
          ],
        }).compile(),
      ).rejects.toThrow('CRITICAL: JWT_SECRET is not set');
    });
  });
});
