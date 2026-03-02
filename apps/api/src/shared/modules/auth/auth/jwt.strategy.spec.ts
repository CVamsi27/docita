import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@workspace/db';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: typeof mockPrisma;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    runUnrestricted: jest.fn((callback) => callback()),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret-key';
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prisma = module.get(PrismaService);
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
    it('should return user data when valid payload is provided', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate(validPayload);

      expect(result).toEqual({
        id: 'user-123',
        userId: 'user-123',
        email: 'test@docita.work',
        role: 'ADMIN',
        name: 'Test Admin',
        clinicId: 'clinic-456',
      });
    });

    it('should use runUnrestricted to bypass tenant context', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await strategy.validate(validPayload);

      expect(prisma.runUnrestricted).toHaveBeenCalledTimes(1);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(validPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should use clinicId from database user, not JWT payload', async () => {
      const userWithDifferentClinic = {
        ...mockUser,
        clinicId: 'different-clinic-id',
      };
      prisma.user.findUnique.mockResolvedValue(userWithDifferentClinic);

      const result = await strategy.validate(validPayload);

      expect(result.clinicId).toBe('different-clinic-id');
    });

    it('should handle null clinicId for super admin users', async () => {
      const superAdmin = { ...mockUser, clinicId: null, role: 'SUPER_ADMIN' };
      prisma.user.findUnique.mockResolvedValue(superAdmin);

      const payloadForSuperAdmin = {
        ...validPayload,
        role: 'SUPER_ADMIN' as Role,
        clinicId: null,
      };

      const result = await strategy.validate(payloadForSuperAdmin);

      expect(result.clinicId).toBeNull();
      expect(result.role).toBe('SUPER_ADMIN');
    });
  });

  describe('constructor', () => {
    it('should throw if JWT_SECRET is not set', async () => {
      const noSecretConfig = {
        get: jest.fn(() => undefined),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            JwtStrategy,
            { provide: PrismaService, useValue: mockPrisma },
            { provide: ConfigService, useValue: noSecretConfig },
          ],
        }).compile(),
      ).rejects.toThrow('CRITICAL: JWT_SECRET is not set');
    });
  });
});
