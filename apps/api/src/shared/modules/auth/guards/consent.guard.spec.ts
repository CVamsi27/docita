import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConsentType } from '@workspace/db';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  asType,
  createFixedClockMock,
  createKeyedReflectorMock,
  mockGetAllAndOverrideKeyMap,
  type MockedReflectorGetAllAndOverride,
} from '@/test-utils';
import { ConsentGuard, REQUIRE_CONSENT_KEY } from './consent.guard';

function createContext(
  params: Record<string, string>,
  clinicId: string | null = 'clinic-1',
): ExecutionContext {
  return asType<ExecutionContext>({
    switchToHttp: (() => ({
      getRequest: () => ({ params, user: clinicId ? { clinicId } : undefined }),
      getResponse: () => ({}),
      getNext: () => undefined,
    })) as ExecutionContext['switchToHttp'],
    getHandler: (() => () => undefined) as ExecutionContext['getHandler'],
    getClass: (() => class TestClass {}) as ExecutionContext['getClass'],
  });
}

function mockRequiredConsentTypes(
  mock: MockedReflectorGetAllAndOverride,
  types: ConsentType[] | undefined,
): void {
  mockGetAllAndOverrideKeyMap(mock, [[REQUIRE_CONSENT_KEY, types]]);
}

describe('ConsentGuard', () => {
  let reflector: { getAllAndOverride: MockedReflectorGetAllAndOverride };
  let prisma: {
    consent: {
      findFirst: jest.MockedFunction<
        (...args: unknown[]) => Promise<{ id: string } | null>
      >;
    };
    clinic: {
      findUnique: jest.MockedFunction<
        (...args: unknown[]) => Promise<{ settings: unknown } | null>
      >;
    };
  };
  let guard: ConsentGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: createKeyedReflectorMock([
        [REQUIRE_CONSENT_KEY, undefined],
      ]),
    };
    prisma = {
      consent: { findFirst: jest.fn() },
      clinic: { findUnique: jest.fn() },
    };
    // Default: clinic has opted in to treatment-consent enforcement.
    prisma.clinic.findUnique.mockResolvedValue({
      settings: { requireTreatmentConsent: true },
    });
    guard = new ConsentGuard(
      asType<Reflector>(reflector),
      asType<ConstructorParameters<typeof ConsentGuard>[1]>(prisma),
      createFixedClockMock(),
    );
  });

  it('allows request when no consent metadata is defined', async () => {
    mockRequiredConsentTypes(reflector.getAllAndOverride, undefined);

    await expect(
      guard.canActivate(createContext({ patientId: 'p1' })),
    ).resolves.toBe(true);
    expect(prisma.consent.findFirst).not.toHaveBeenCalled();
  });

  it('allows request when patientId is missing', async () => {
    mockRequiredConsentTypes(reflector.getAllAndOverride, [
      ConsentType.TREATMENT,
    ]);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(prisma.consent.findFirst).not.toHaveBeenCalled();
  });

  it('skips enforcement (opt-in) when the clinic flag is off', async () => {
    mockRequiredConsentTypes(reflector.getAllAndOverride, [
      ConsentType.TREATMENT,
    ]);
    prisma.clinic.findUnique.mockResolvedValue({
      settings: { requireTreatmentConsent: false },
    });

    await expect(
      guard.canActivate(createContext({ patientId: 'p1' })),
    ).resolves.toBe(true);
    expect(prisma.consent.findFirst).not.toHaveBeenCalled();
  });

  it('skips enforcement when there is no clinic context', async () => {
    mockRequiredConsentTypes(reflector.getAllAndOverride, [
      ConsentType.TREATMENT,
    ]);

    await expect(
      guard.canActivate(createContext({ patientId: 'p1' }, null)),
    ).resolves.toBe(true);
    expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
    expect(prisma.consent.findFirst).not.toHaveBeenCalled();
  });

  it('allows request when all required consent types are active', async () => {
    mockRequiredConsentTypes(reflector.getAllAndOverride, [
      ConsentType.TREATMENT,
      ConsentType.PROCEDURE,
    ]);
    prisma.consent.findFirst
      .mockResolvedValueOnce({ id: 'consent-1' })
      .mockResolvedValueOnce({ id: 'consent-2' });

    await expect(
      guard.canActivate(createContext({ patientId: 'p1' })),
    ).resolves.toBe(true);
    expect(prisma.consent.findFirst).toHaveBeenCalledTimes(2);
  });

  it('blocks request when required consent is missing', async () => {
    mockRequiredConsentTypes(reflector.getAllAndOverride, [
      ConsentType.SURGERY,
    ]);
    prisma.consent.findFirst.mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext({ patientId: 'p1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('queries only ACTIVE non-expired consents', async () => {
    mockRequiredConsentTypes(reflector.getAllAndOverride, [
      ConsentType.TELEHEALTH,
    ]);
    prisma.consent.findFirst.mockResolvedValue({ id: 'consent-1' });

    await guard.canActivate(createContext({ patientId: 'patient-1' }));

    expect(prisma.consent.findFirst).toHaveBeenCalledWith({
      where: {
        patientId: 'patient-1',
        consentType: ConsentType.TELEHEALTH,
        status: 'ACTIVE',
        OR: [{ validUntil: null }, { validUntil: { gt: expect.any(Date) } }],
      },
      select: { id: true },
    });
  });
});
