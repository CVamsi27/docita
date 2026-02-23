/**
 * Unit Tests for CombinedAuthGuard
 *
 * Tests:
 * - Public endpoints bypass all checks
 * - Role-based access control
 * - Tier-based access control (with caching)
 * - Correct error codes and messages
 * - Deny by default behavior
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CombinedAuthGuard } from './combined-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ClinicAuthCacheService } from './clinic-auth-cache.service';
import { Role, ClinicTier, SubscriptionStatus } from '@workspace/db';
import { Tier } from '@workspace/types';

describe('CombinedAuthGuard', () => {
  let guard: CombinedAuthGuard;
  let reflector: Reflector;
  let clinicAuthCache: jest.Mocked<ClinicAuthCacheService>;
  let jwtAuthGuard: jest.Mocked<JwtAuthGuard>;

  const mockClinicAuth = {
    tier: ClinicTier.PRO,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    hasIntelligence: false,
    features: {},
  };

  const createMockContext = (user: any = null): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CombinedAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue(undefined),
          },
        },
        {
          provide: JwtAuthGuard,
          useValue: {
            canActivate: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: ClinicAuthCacheService,
          useValue: {
            getClinicAuth: jest.fn().mockResolvedValue(mockClinicAuth),
          },
        },
      ],
    }).compile();

    guard = module.get<CombinedAuthGuard>(CombinedAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    clinicAuthCache = module.get(ClinicAuthCacheService);
    jwtAuthGuard = module.get(JwtAuthGuard);
  });

  describe('public endpoints', () => {
    it('should allow access to public endpoints', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) => {
          if (key === 'isPublic') return true;
          return undefined;
        });

      const context = createMockContext();
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('authentication', () => {
    it('should throw UnauthorizedException when JWT fails', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      jwtAuthGuard.canActivate.mockRejectedValue(new Error('Invalid token'));

      const context = createMockContext();
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('role-based access', () => {
    it('should deny access when user lacks required role', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) => {
          if (key === 'roles') return [Role.ADMIN];
          return undefined;
        });

      const context = createMockContext({ role: 'DOCTOR', clinicId: 'c1' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow access when user has required role', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) => {
          if (key === 'roles') return [Role.ADMIN, Role.DOCTOR];
          return undefined;
        });

      const context = createMockContext({ role: 'DOCTOR', clinicId: 'c1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny by default when no roles specified', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockContext({ role: 'DOCTOR', clinicId: 'c1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(false);
    });
  });

  describe('tier-based access', () => {
    it('should allow access when tier is sufficient', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) => {
          if (key === 'roles') return [Role.DOCTOR];
          if (key === 'requiredTier') return Tier.CORE;
          return undefined;
        });

      const context = createMockContext({ role: 'DOCTOR', clinicId: 'c1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access when tier is insufficient', async () => {
      clinicAuthCache.getClinicAuth.mockResolvedValue({
        ...mockClinicAuth,
        tier: ClinicTier.CAPTURE,
      });

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) => {
          if (key === 'roles') return [Role.DOCTOR];
          if (key === 'requiredTier') return Tier.PRO;
          return undefined;
        });

      const context = createMockContext({ role: 'DOCTOR', clinicId: 'c1' });
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should deny Intelligence features when add-on is not active', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) => {
          if (key === 'roles') return [Role.DOCTOR];
          if (key === 'requiredTier') return Tier.INTELLIGENCE;
          return undefined;
        });

      const context = createMockContext({ role: 'DOCTOR', clinicId: 'c1' });
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should deny when subscription is inactive', async () => {
      clinicAuthCache.getClinicAuth.mockResolvedValue({
        ...mockClinicAuth,
        subscriptionStatus: SubscriptionStatus.CANCELLED,
      });

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) => {
          if (key === 'roles') return [Role.DOCTOR];
          if (key === 'requiredTier') return Tier.CORE;
          return undefined;
        });

      const context = createMockContext({ role: 'DOCTOR', clinicId: 'c1' });
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('error responses', () => {
    it('should include upgrade URL in tier error', async () => {
      clinicAuthCache.getClinicAuth.mockResolvedValue({
        ...mockClinicAuth,
        tier: ClinicTier.CAPTURE,
      });

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: string) => {
          if (key === 'roles') return [Role.DOCTOR];
          if (key === 'requiredTier') return Tier.PRO;
          return undefined;
        });

      const context = createMockContext({ role: 'DOCTOR', clinicId: 'c1' });
      try {
        await guard.canActivate(context);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.code).toBe('INSUFFICIENT_TIER');
        expect(error.response.action).toBe('UPGRADE');
        expect(error.response.upgradeUrl).toBe('/settings/billing');
      }
    });
  });
});
