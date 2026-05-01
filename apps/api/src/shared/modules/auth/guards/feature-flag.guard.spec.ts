import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import {
  asType,
  createKeyedReflectorMock,
  mockGetAllAndOverrideKeyMap,
  type MockedReflectorGetAllAndOverride,
} from '@/test-utils';
import { FEATURE_FLAG_KEY, FeatureFlagGuard } from './feature-flag.guard';

function mockRequireFeatureFlag(
  mock: MockedReflectorGetAllAndOverride,
  flagName: string | undefined,
): void {
  mockGetAllAndOverrideKeyMap(mock, [[FEATURE_FLAG_KEY, flagName]]);
}

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

describe('FeatureFlagGuard', () => {
  let reflector: { getAllAndOverride: MockedReflectorGetAllAndOverride };
  let featureFlagService: jest.Mocked<Pick<FeatureFlagService, 'isEnabled'>>;
  let guard: FeatureFlagGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: createKeyedReflectorMock([
        [FEATURE_FLAG_KEY, undefined],
      ]),
    };
    featureFlagService = {
      isEnabled: jest.fn(),
    };
    guard = new FeatureFlagGuard(
      asType<Reflector>(reflector),
      asType<FeatureFlagService>(featureFlagService),
    );
  });

  it('allows request when no feature flag metadata is set', async () => {
    mockRequireFeatureFlag(reflector.getAllAndOverride, undefined);

    await expect(
      guard.canActivate(createContext({ user: { clinicId: 'clinic-1' } })),
    ).resolves.toBe(true);
    expect(featureFlagService.isEnabled).not.toHaveBeenCalled();
  });

  it('uses clinic id from authenticated user when checking flag', async () => {
    mockRequireFeatureFlag(
      reflector.getAllAndOverride,
      'enable_queue_management',
    );
    featureFlagService.isEnabled.mockResolvedValue(true);

    await expect(
      guard.canActivate(createContext({ user: { clinicId: 'clinic-1' } })),
    ).resolves.toBe(true);

    expect(featureFlagService.isEnabled).toHaveBeenCalledWith(
      'enable_queue_management',
      'clinic-1',
    );
  });

  it('falls back to clinic id from query when user clinic is unavailable', async () => {
    mockRequireFeatureFlag(reflector.getAllAndOverride, 'enable_ai_features');
    featureFlagService.isEnabled.mockResolvedValue(true);

    await expect(
      guard.canActivate(createContext({ user: {}, query: { clinicId: 'c2' } })),
    ).resolves.toBe(true);
    expect(featureFlagService.isEnabled).toHaveBeenCalledWith(
      'enable_ai_features',
      'c2',
    );
  });

  it('blocks request when feature flag is disabled', async () => {
    mockRequireFeatureFlag(reflector.getAllAndOverride, 'enable_ai_features');
    featureFlagService.isEnabled.mockResolvedValue(false);

    await expect(
      guard.canActivate(createContext({ user: { clinicId: 'clinic-1' } })),
    ).rejects.toThrow(ForbiddenException);
  });
});
