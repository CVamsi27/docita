import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClinicTier, SubscriptionStatus } from '@workspace/db';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ClinicAuthCacheService } from '@/shared/modules/auth/auth/clinic-auth-cache.service';
import { asType } from '@/test-utils/as-type';
import {
  IS_PUBLIC_KEY,
  SKIP_SUBSCRIPTION_CHECK_KEY,
  SubscriptionStatusGuard,
} from './subscription-status.guard';

function createContext(user: unknown): ExecutionContext {
  return asType<ExecutionContext>({
    switchToHttp: (() => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => undefined,
    })) as ExecutionContext['switchToHttp'],
    getHandler: (() => () => undefined) as ExecutionContext['getHandler'],
    getClass: (() => class TestClass {}) as ExecutionContext['getClass'],
  });
}

describe('SubscriptionStatusGuard', () => {
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let clinicAuthCache: jest.Mocked<
    Pick<ClinicAuthCacheService, 'getClinicAuth'>
  >;
  let guard: SubscriptionStatusGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    clinicAuthCache = {
      getClinicAuth: jest.fn(),
    };
    guard = new SubscriptionStatusGuard(
      asType<Reflector>(reflector),
      asType<ClinicAuthCacheService>(clinicAuthCache),
    );
  });

  it('skips check for public routes', async () => {
    reflector.getAllAndOverride.mockImplementation((key: unknown) => {
      if (key === IS_PUBLIC_KEY) return true;
      return false;
    });

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
    expect(clinicAuthCache.getClinicAuth).not.toHaveBeenCalled();
  });

  it('skips check when metadata disables subscription guard', async () => {
    reflector.getAllAndOverride.mockImplementation((key: unknown) => {
      if (key === SKIP_SUBSCRIPTION_CHECK_KEY) return true;
      return false;
    });

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
    expect(clinicAuthCache.getClinicAuth).not.toHaveBeenCalled();
  });

  it('allows request when user is missing', async () => {
    await expect(guard.canActivate(createContext(undefined))).resolves.toBe(
      true,
    );
    expect(clinicAuthCache.getClinicAuth).not.toHaveBeenCalled();
  });

  it('allows request when user has no clinic id', async () => {
    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(clinicAuthCache.getClinicAuth).not.toHaveBeenCalled();
  });

  it('allows ACTIVE/TRIALING and restricted-but-allowed billing states', async () => {
    clinicAuthCache.getClinicAuth
      .mockResolvedValueOnce({
        tier: ClinicTier.STARTER,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionGraceUntil: null,
        hasIntelligence: false,
        features: {},
      })
      .mockResolvedValueOnce({
        tier: ClinicTier.STARTER,
        subscriptionStatus: SubscriptionStatus.TRIALING,
        subscriptionGraceUntil: null,
        hasIntelligence: false,
        features: {},
      })
      .mockResolvedValueOnce({
        tier: ClinicTier.STARTER,
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
        subscriptionGraceUntil: null,
        hasIntelligence: false,
        features: {},
      })
      .mockResolvedValueOnce({
        tier: ClinicTier.STARTER,
        subscriptionStatus: SubscriptionStatus.GRACE,
        subscriptionGraceUntil: null,
        hasIntelligence: false,
        features: {},
      })
      .mockResolvedValueOnce({
        tier: ClinicTier.STARTER,
        subscriptionStatus: SubscriptionStatus.PAUSED,
        subscriptionGraceUntil: null,
        hasIntelligence: false,
        features: {},
      });

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
  });

  it('blocks inactive subscriptions', async () => {
    clinicAuthCache.getClinicAuth.mockResolvedValue({
      tier: ClinicTier.STARTER,
      subscriptionStatus: SubscriptionStatus.CANCELLED,
      subscriptionGraceUntil: null,
      hasIntelligence: false,
      features: {},
    });

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('fails open when lookup errors occur', async () => {
    clinicAuthCache.getClinicAuth.mockRejectedValue(new Error('cache timeout'));

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
  });

  it('blocks staff when grace deadline has passed', async () => {
    clinicAuthCache.getClinicAuth.mockResolvedValue({
      tier: ClinicTier.STARTER,
      subscriptionStatus: SubscriptionStatus.GRACE,
      subscriptionGraceUntil: new Date('2020-01-01T00:00:00.000Z'),
      hasIntelligence: false,
      features: {},
    });

    await expect(
      guard.canActivate(
        createContext({
          clinicId: 'clinic-1',
          role: 'RECEPTIONIST',
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows billing admins when grace deadline has passed', async () => {
    clinicAuthCache.getClinicAuth.mockResolvedValue({
      tier: ClinicTier.STARTER,
      subscriptionStatus: SubscriptionStatus.PAST_DUE,
      subscriptionGraceUntil: new Date('2020-01-01T00:00:00.000Z'),
      hasIntelligence: false,
      features: {},
    });

    await expect(
      guard.canActivate(
        createContext({
          clinicId: 'clinic-1',
          role: 'ADMIN',
        }),
      ),
    ).resolves.toBe(true);
  });
});
