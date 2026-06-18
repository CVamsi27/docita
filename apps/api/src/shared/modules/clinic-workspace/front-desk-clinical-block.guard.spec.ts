import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ClinicTier, SubscriptionStatus } from '@workspace/db';
import { asType } from '@/test-utils';
import { FrontDeskClinicalBlockGuard } from './front-desk-clinical-block.guard';
import { ClinicAuthCacheService } from '@/shared/modules/auth/auth/clinic-auth-cache.service';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return asType<ExecutionContext>({
    switchToHttp: (() => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    })) as ExecutionContext['switchToHttp'],
    getHandler: (() => () => undefined) as ExecutionContext['getHandler'],
    getClass: (() => class TestClass {}) as ExecutionContext['getClass'],
  });
}

describe('FrontDeskClinicalBlockGuard', () => {
  let guard: FrontDeskClinicalBlockGuard;
  const getClinicAuth = jest.fn<ClinicAuthCacheService['getClinicAuth']>();

  beforeEach(() => {
    getClinicAuth.mockReset();
    guard = new FrontDeskClinicalBlockGuard(
      asType<ClinicAuthCacheService>({ getClinicAuth }),
    );
  });

  it('allows GET without loading clinic auth', async () => {
    await expect(
      guard.canActivate(
        createContext({ method: 'GET', user: { clinicId: 'c1' } }),
      ),
    ).resolves.toBe(true);
    expect(getClinicAuth).not.toHaveBeenCalled();
  });

  it('allows mutating methods when plan mode is FULL', async () => {
    getClinicAuth.mockResolvedValue({
      tier: ClinicTier.PROFESSIONAL,
      planMode: 'FULL',
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionGraceUntil: null,
      subscriptionTrialEnd: null,
      subscriptionCurrentPeriodEnd: null,
      hasOutstandingPendingPayment: false,
      hasIntelligence: false,
      features: {},
    });

    await expect(
      guard.canActivate(
        createContext({ method: 'POST', user: { clinicId: 'c1' } }),
      ),
    ).resolves.toBe(true);
  });

  it('forbids mutating methods on clinical tier with Front Desk plan mode', async () => {
    getClinicAuth.mockResolvedValue({
      tier: ClinicTier.ESSENTIAL,
      planMode: 'FRONT_DESK',
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionGraceUntil: null,
      subscriptionTrialEnd: null,
      subscriptionCurrentPeriodEnd: null,
      hasOutstandingPendingPayment: false,
      hasIntelligence: false,
      features: {},
    });

    await expect(
      guard.canActivate(
        createContext({ method: 'POST', user: { clinicId: 'c1' } }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows mutating methods when clinic id is missing on user', async () => {
    await expect(
      guard.canActivate(createContext({ method: 'POST', user: {} })),
    ).resolves.toBe(true);
    expect(getClinicAuth).not.toHaveBeenCalled();
  });
});
