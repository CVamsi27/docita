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
import { FEATURE_KEY, Feature, TIER_KEY, Tier } from './tier.decorator';
import { TierGuard } from './tier.guard';

type ClinicRecord = {
  tier: ClinicTier;
  intelligenceAddon: IntelligenceAddon;
  features: Record<string, boolean>;
  subscriptionStatus: SubscriptionStatus;
  subscription: { graceUntil: Date | null };
};

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

describe('TierGuard', () => {
  let reflector: { getAllAndOverride: MockedReflectorGetAllAndOverride };
  let prisma: {
    clinic: {
      findUnique: jest.MockedFunction<
        (...args: unknown[]) => Promise<ClinicRecord | null>
      >;
    };
  };
  let guard: TierGuard;

  const activeStarterClinic: ClinicRecord = {
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
        [TIER_KEY, undefined],
        [FEATURE_KEY, undefined],
      ]),
    };
    prisma = {
      clinic: {
        findUnique: jest.fn(),
      },
    };
    guard = new TierGuard(
      asType<Reflector>(reflector),
      asType<ConstructorParameters<typeof TierGuard>[1]>(prisma),
    );
  });

  function setMetadata(requiredTier?: Tier, requiredFeature?: Feature): void {
    mockGetAllAndOverrideKeyMap(reflector.getAllAndOverride, [
      [IS_PUBLIC_KEY, false],
      [TIER_KEY, requiredTier],
      [FEATURE_KEY, requiredFeature],
    ]);
  }

  it('allows public routes without loading clinic', async () => {
    mockGetAllAndOverrideKeyMap(reflector.getAllAndOverride, [
      [IS_PUBLIC_KEY, true],
      [TIER_KEY, Tier.ESSENTIAL],
      [FEATURE_KEY, undefined],
    ]);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
  });

  it('allows request when no tier or feature metadata is present', async () => {
    setMetadata(undefined, undefined);

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
    expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
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
    expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
  });

  it('blocks request when clinic does not exist', async () => {
    setMetadata(Tier.ESSENTIAL, undefined);
    prisma.clinic.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks request when subscription is inactive', async () => {
    setMetadata(Tier.STARTER, undefined);
    prisma.clinic.findUnique.mockResolvedValue({
      ...activeStarterClinic,
      subscriptionStatus: SubscriptionStatus.CANCELLED,
    });

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows tier checks when subscription is in restricted-but-allowed state', async () => {
    setMetadata(Tier.STARTER, undefined);
    prisma.clinic.findUnique.mockResolvedValue({
      ...activeStarterClinic,
      subscriptionStatus: SubscriptionStatus.PAST_DUE,
    });

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
  });

  it('blocks feature when explicit clinic override disables it', async () => {
    setMetadata(undefined, Feature.QUEUE_MANAGEMENT);
    prisma.clinic.findUnique.mockResolvedValue({
      ...activeStarterClinic,
      features: {
        [Feature.QUEUE_MANAGEMENT]: false,
      },
    });

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows feature when explicit clinic override enables it', async () => {
    setMetadata(undefined, Feature.QUEUE_MANAGEMENT);
    prisma.clinic.findUnique.mockResolvedValue({
      ...activeStarterClinic,
      features: {
        [Feature.QUEUE_MANAGEMENT]: true,
      },
    });

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
  });

  it('blocks feature when clinic tier is lower than required feature tier', async () => {
    setMetadata(undefined, Feature.QUEUE_MANAGEMENT);
    prisma.clinic.findUnique.mockResolvedValue(activeStarterClinic);

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows feature when clinic tier satisfies required feature tier', async () => {
    setMetadata(undefined, Feature.QUEUE_MANAGEMENT);
    prisma.clinic.findUnique.mockResolvedValue({
      ...activeStarterClinic,
      tier: ClinicTier.ESSENTIAL,
    });

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
  });

  it('blocks planned features even when the clinic tier is high enough', async () => {
    setMetadata(undefined, Feature.BROADCAST_CAMPAIGNS);
    prisma.clinic.findUnique.mockResolvedValue({
      ...activeStarterClinic,
      tier: ClinicTier.PROFESSIONAL,
    });

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks planned features before clinic feature overrides are applied', async () => {
    setMetadata(undefined, Feature.BROADCAST_CAMPAIGNS);
    prisma.clinic.findUnique.mockResolvedValue({
      ...activeStarterClinic,
      tier: ClinicTier.PROFESSIONAL,
      features: {
        [Feature.BROADCAST_CAMPAIGNS]: true,
      },
    });

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks INTELLIGENCE tier requirement when addon is not active', async () => {
    setMetadata(Tier.INTELLIGENCE, undefined);
    prisma.clinic.findUnique.mockResolvedValue(activeStarterClinic);

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks tier requirement when clinic tier is too low', async () => {
    setMetadata(Tier.ESSENTIAL, undefined);
    prisma.clinic.findUnique.mockResolvedValue(activeStarterClinic);

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows tier requirement when clinic tier is sufficient', async () => {
    setMetadata(Tier.ESSENTIAL, undefined);
    prisma.clinic.findUnique.mockResolvedValue({
      ...activeStarterClinic,
      tier: ClinicTier.PROFESSIONAL,
    });

    await expect(
      guard.canActivate(createContext({ clinicId: 'clinic-1' })),
    ).resolves.toBe(true);
  });

  it('blocks tier checks after grace deadline for non-admin roles', async () => {
    setMetadata(Tier.STARTER, undefined);
    prisma.clinic.findUnique.mockResolvedValue({
      ...activeStarterClinic,
      subscriptionStatus: SubscriptionStatus.GRACE,
      subscription: {
        graceUntil: new Date('2020-01-01T00:00:00.000Z'),
      },
    });

    await expect(
      guard.canActivate(
        createContext({ clinicId: 'clinic-1', role: 'DOCTOR' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows tier checks after grace deadline for billing admins', async () => {
    setMetadata(Tier.STARTER, undefined);
    prisma.clinic.findUnique.mockResolvedValue({
      ...activeStarterClinic,
      subscriptionStatus: SubscriptionStatus.GRACE,
      subscription: {
        graceUntil: new Date('2020-01-01T00:00:00.000Z'),
      },
    });

    await expect(
      guard.canActivate(
        createContext({ clinicId: 'clinic-1', role: 'ADMIN_DOCTOR' }),
      ),
    ).resolves.toBe(true);
  });
});
