import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ClinicTier,
  IntelligenceAddon,
  SubscriptionStatus,
} from '@workspace/db';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  asType,
  createKeyedReflectorMock,
  mockGetAllAndOverrideKeyMap,
  type MockedReflectorGetAllAndOverride,
} from '@/test-utils';
import { IS_PUBLIC_KEY } from './public.decorator';
import { IS_UPLOAD_SESSION_SECRET_ROUTE_KEY } from './upload-session-secret-route.decorator';
import { FEATURE_KEY, Feature, TIER_KEY, Tier } from './tier.decorator';
import { TierGuard } from './tier.guard';
import { ClinicAuthCacheService } from './clinic-auth-cache.service';

type ClinicAuthRecord = Awaited<
  ReturnType<ClinicAuthCacheService['getClinicAuth']>
>;

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

function toClinicAuth(clinic: {
  tier: ClinicTier;
  intelligenceAddon: IntelligenceAddon;
  features: Record<string, boolean>;
  subscriptionStatus: SubscriptionStatus;
  subscription: { graceUntil: Date | null; currentPeriodEnd?: Date | null };
  planMode?: 'FULL' | 'FRONT_DESK' | 'CORE';
}): ClinicAuthRecord {
  return {
    tier: clinic.tier,
    planMode: clinic.planMode ?? 'FULL',
    subscriptionStatus: clinic.subscriptionStatus,
    subscriptionGraceUntil: clinic.subscription.graceUntil,
    subscriptionTrialEnd: null,
    subscriptionCurrentPeriodEnd: clinic.subscription.currentPeriodEnd ?? null,
    hasOutstandingPendingPayment: false,
    hasIntelligence: clinic.intelligenceAddon === IntelligenceAddon.ACTIVE,
    features: clinic.features,
  };
}

describe('TierGuard', () => {
  let reflector: { getAllAndOverride: MockedReflectorGetAllAndOverride };
  let clinicAuthCache: {
    getClinicAuth: jest.MockedFunction<ClinicAuthCacheService['getClinicAuth']>;
  };
  let guard: TierGuard;

  const activeStarterClinic = {
    tier: ClinicTier.STARTER,
    intelligenceAddon: IntelligenceAddon.NONE,
    features: {},
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    subscription: { graceUntil: null },
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: createKeyedReflectorMock([
        [IS_PUBLIC_KEY, false],
        [IS_UPLOAD_SESSION_SECRET_ROUTE_KEY, false],
        [TIER_KEY, undefined],
        [FEATURE_KEY, undefined],
      ]),
    };
    clinicAuthCache = {
      getClinicAuth: jest.fn(),
    };
    guard = new TierGuard(
      asType<Reflector>(reflector),
      asType<ClinicAuthCacheService>(clinicAuthCache),
    );
  });

  function setMetadata(requiredTier?: Tier, requiredFeature?: Feature): void {
    mockGetAllAndOverrideKeyMap(reflector.getAllAndOverride, [
      [IS_PUBLIC_KEY, false],
      [IS_UPLOAD_SESSION_SECRET_ROUTE_KEY, false],
      [TIER_KEY, requiredTier],
      [FEATURE_KEY, requiredFeature],
    ]);
  }

  it('allows public routes without loading clinic', async () => {
    mockGetAllAndOverrideKeyMap(reflector.getAllAndOverride, [
      [IS_PUBLIC_KEY, true],
      [IS_UPLOAD_SESSION_SECRET_ROUTE_KEY, false],
      [TIER_KEY, Tier.ESSENTIAL],
      [FEATURE_KEY, undefined],
    ]);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(clinicAuthCache.getClinicAuth).not.toHaveBeenCalled();
  });

  it('allows upload-session-secret routes without loading clinic', async () => {
    mockGetAllAndOverrideKeyMap(reflector.getAllAndOverride, [
      [IS_PUBLIC_KEY, false],
      [IS_UPLOAD_SESSION_SECRET_ROUTE_KEY, true],
      [TIER_KEY, Tier.ESSENTIAL],
      [FEATURE_KEY, Feature.DOCUMENT_ARCHIVAL],
    ]);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(clinicAuthCache.getClinicAuth).not.toHaveBeenCalled();
  });

  it('allows request when no tier or feature metadata is present', async () => {
    setMetadata(undefined, undefined);

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
    expect(clinicAuthCache.getClinicAuth).not.toHaveBeenCalled();
  });

  it('blocks request when user has no clinicId', async () => {
    setMetadata(Tier.ESSENTIAL, undefined);

    await expect(guard.canActivate(createContext({}))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows INTERNAL users even without a clinicId', async () => {
    setMetadata(Tier.ENTERPRISE, Feature.BROADCAST_CAMPAIGNS);

    await expect(
      guard.canActivate(createContext({ role: 'INTERNAL' })),
    ).resolves.toBe(true);
    expect(clinicAuthCache.getClinicAuth).not.toHaveBeenCalled();
  });

  it('blocks request when clinic does not exist', async () => {
    setMetadata(Tier.ESSENTIAL, undefined);
    clinicAuthCache.getClinicAuth.mockRejectedValue(new Error('not found'));

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks request when subscription is inactive', async () => {
    setMetadata(Tier.STARTER, undefined);
    clinicAuthCache.getClinicAuth.mockResolvedValue(
      toClinicAuth({
        ...activeStarterClinic,
        subscriptionStatus: SubscriptionStatus.CANCELLED,
      }),
    );

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows tier checks when subscription is in restricted-but-allowed state', async () => {
    setMetadata(Tier.STARTER, undefined);
    clinicAuthCache.getClinicAuth.mockResolvedValue(
      toClinicAuth({
        ...activeStarterClinic,
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
      }),
    );

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
  });

  it('blocks feature when explicit clinic override disables it', async () => {
    setMetadata(undefined, Feature.WHATSAPP_MESSAGING);
    clinicAuthCache.getClinicAuth.mockResolvedValue(
      toClinicAuth({
        ...activeStarterClinic,
        features: {
          [Feature.WHATSAPP_MESSAGING]: false,
        },
      }),
    );

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows feature when explicit clinic override enables it', async () => {
    setMetadata(undefined, Feature.WHATSAPP_MESSAGING);
    clinicAuthCache.getClinicAuth.mockResolvedValue(
      toClinicAuth({
        ...activeStarterClinic,
        features: {
          [Feature.WHATSAPP_MESSAGING]: true,
        },
      }),
    );

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
  });

  it('blocks feature when clinic tier is lower than required feature tier', async () => {
    setMetadata(undefined, Feature.QUEUE_MANAGEMENT);
    clinicAuthCache.getClinicAuth.mockResolvedValue(
      toClinicAuth(activeStarterClinic),
    );

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows feature when clinic tier satisfies required feature tier', async () => {
    setMetadata(undefined, Feature.QUEUE_MANAGEMENT);
    clinicAuthCache.getClinicAuth.mockResolvedValue(
      toClinicAuth({
        ...activeStarterClinic,
        tier: ClinicTier.ESSENTIAL,
      }),
    );

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
  });

  it('blocks planned features even when the clinic tier is high enough', async () => {
    setMetadata(undefined, Feature.BROADCAST_CAMPAIGNS);
    clinicAuthCache.getClinicAuth.mockResolvedValue(
      toClinicAuth({
        ...activeStarterClinic,
        tier: ClinicTier.PROFESSIONAL,
      }),
    );

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks feature on Front Desk plan mode even when clinical tier is high', async () => {
    setMetadata(undefined, Feature.DIGITAL_PRESCRIPTIONS);
    clinicAuthCache.getClinicAuth.mockResolvedValue(
      toClinicAuth({
        ...activeStarterClinic,
        tier: ClinicTier.PROFESSIONAL,
        planMode: 'FRONT_DESK',
      }),
    );

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks INTELLIGENCE tier requirement when addon is not active', async () => {
    setMetadata(Tier.INTELLIGENCE, undefined);
    clinicAuthCache.getClinicAuth.mockResolvedValue(
      toClinicAuth(activeStarterClinic),
    );

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks tier requirement when clinic tier is too low', async () => {
    setMetadata(Tier.ESSENTIAL, undefined);
    clinicAuthCache.getClinicAuth.mockResolvedValue(
      toClinicAuth(activeStarterClinic),
    );

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows tier requirement when clinic tier is sufficient', async () => {
    setMetadata(Tier.ESSENTIAL, undefined);
    clinicAuthCache.getClinicAuth.mockResolvedValue(
      toClinicAuth({
        ...activeStarterClinic,
        tier: ClinicTier.PROFESSIONAL,
      }),
    );

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
  });

  it('blocks tier checks after grace deadline for non-admin roles', async () => {
    setMetadata(Tier.STARTER, undefined);
    clinicAuthCache.getClinicAuth.mockResolvedValue(
      toClinicAuth({
        ...activeStarterClinic,
        subscriptionStatus: SubscriptionStatus.GRACE,
        subscription: {
          graceUntil: new Date('2020-01-01T00:00:00.000Z'),
        },
      }),
    );

    await expect(
      guard.canActivate(
        createContext({ clinicId: 'clinic-1', role: 'DOCTOR' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows tier checks after grace deadline for billing admins', async () => {
    setMetadata(Tier.STARTER, undefined);
    clinicAuthCache.getClinicAuth.mockResolvedValue(
      toClinicAuth({
        ...activeStarterClinic,
        subscriptionStatus: SubscriptionStatus.GRACE,
        subscription: {
          graceUntil: new Date('2020-01-01T00:00:00.000Z'),
        },
      }),
    );

    await expect(
      guard.canActivate(
        createContext({ clinicId: 'clinic-1', role: 'ADMIN_DOCTOR' }),
      ),
    ).resolves.toBe(true);
  });
});
