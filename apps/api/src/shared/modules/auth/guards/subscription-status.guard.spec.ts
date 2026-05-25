import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClinicTier, SubscriptionStatus } from '@workspace/db';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ClinicAuthCacheService } from '@/shared/modules/auth/auth/clinic-auth-cache.service';
import {
  asType,
  createFixedClockMock,
  createKeyedReflectorMock,
  mockGetAllAndOverrideKeyBranch,
  type MockedReflectorGetAllAndOverride,
} from '@/test-utils';
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
  let reflector: { getAllAndOverride: MockedReflectorGetAllAndOverride };
  let clinicAuthCache: jest.Mocked<
    Pick<ClinicAuthCacheService, 'getClinicAuth'>
  >;
  let guard: SubscriptionStatusGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: createKeyedReflectorMock([
        [IS_PUBLIC_KEY, false],
        [SKIP_SUBSCRIPTION_CHECK_KEY, false],
      ]),
    };
    clinicAuthCache = {
      getClinicAuth: jest.fn(),
    };
    guard = new SubscriptionStatusGuard(
      asType<Reflector>(reflector),
      asType<ClinicAuthCacheService>(clinicAuthCache),
      createFixedClockMock(),
    );
  });

  it('skips check for public routes', async () => {
    mockGetAllAndOverrideKeyBranch(
      reflector.getAllAndOverride,
      IS_PUBLIC_KEY,
      true,
      false,
    );

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
    expect(clinicAuthCache.getClinicAuth).not.toHaveBeenCalled();
  });

  it('skips check when metadata disables subscription guard', async () => {
    mockGetAllAndOverrideKeyBranch(
      reflector.getAllAndOverride,
      SKIP_SUBSCRIPTION_CHECK_KEY,
      true,
      false,
    );

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
        subscriptionTrialEnd: null,
        subscriptionCurrentPeriodEnd: null,
        hasOutstandingPendingPayment: false,
        hasIntelligence: false,
        features: {},
      })
      .mockResolvedValueOnce({
        tier: ClinicTier.STARTER,
        subscriptionStatus: SubscriptionStatus.TRIALING,
        subscriptionGraceUntil: null,
        subscriptionTrialEnd: null,
        subscriptionCurrentPeriodEnd: null,
        hasOutstandingPendingPayment: false,
        hasIntelligence: false,
        features: {},
      })
      .mockResolvedValueOnce({
        tier: ClinicTier.STARTER,
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
        subscriptionGraceUntil: null,
        subscriptionTrialEnd: null,
        subscriptionCurrentPeriodEnd: null,
        hasOutstandingPendingPayment: false,
        hasIntelligence: false,
        features: {},
      })
      .mockResolvedValueOnce({
        tier: ClinicTier.STARTER,
        subscriptionStatus: SubscriptionStatus.GRACE,
        subscriptionGraceUntil: null,
        subscriptionTrialEnd: null,
        subscriptionCurrentPeriodEnd: null,
        hasOutstandingPendingPayment: false,
        hasIntelligence: false,
        features: {},
      })
      .mockResolvedValueOnce({
        tier: ClinicTier.STARTER,
        subscriptionStatus: SubscriptionStatus.PAUSED,
        subscriptionGraceUntil: null,
        subscriptionTrialEnd: null,
        subscriptionCurrentPeriodEnd: null,
        hasOutstandingPendingPayment: false,
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
      subscriptionTrialEnd: null,
      subscriptionCurrentPeriodEnd: null,
      hasOutstandingPendingPayment: false,
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
      subscriptionTrialEnd: null,
      subscriptionCurrentPeriodEnd: new Date('2020-01-01T00:00:00.000Z'),
      hasOutstandingPendingPayment: false,
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
      subscriptionTrialEnd: null,
      subscriptionCurrentPeriodEnd: new Date('2020-01-01T00:00:00.000Z'),
      hasOutstandingPendingPayment: false,
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

  it('blocks staff when renewal period ended with a pending payment', async () => {
    clinicAuthCache.getClinicAuth.mockResolvedValue({
      tier: ClinicTier.STARTER,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionGraceUntil: null,
      subscriptionTrialEnd: null,
      subscriptionCurrentPeriodEnd: new Date('2020-01-01T00:00:00.000Z'),
      hasOutstandingPendingPayment: true,
      hasIntelligence: false,
      features: {},
    });

    await expect(
      guard.canActivate(
        createContext({
          clinicId: 'clinic-1',
          role: 'DOCTOR',
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows billing admins when renewal period ended with a pending payment', async () => {
    clinicAuthCache.getClinicAuth.mockResolvedValue({
      tier: ClinicTier.STARTER,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionGraceUntil: null,
      subscriptionTrialEnd: null,
      subscriptionCurrentPeriodEnd: new Date('2020-01-01T00:00:00.000Z'),
      hasOutstandingPendingPayment: true,
      hasIntelligence: false,
      features: {},
    });

    await expect(
      guard.canActivate(
        createContext({
          clinicId: 'clinic-1',
          role: 'ADMIN_DOCTOR',
        }),
      ),
    ).resolves.toBe(true);
  });
});
