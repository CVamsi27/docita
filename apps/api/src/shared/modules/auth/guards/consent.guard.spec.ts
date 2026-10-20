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
import {
  getCurrentTenant,
  tenantStorage,
} from '@/shared/common/middleware/tenant.middleware';
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
      findMany: jest.MockedFunction<
        (...args: unknown[]) => Promise<Array<{ consentType: ConsentType }>>
      >;
    };
    clinic: {
      findUnique: jest.MockedFunction<
        (...args: unknown[]) => Promise<{ settings: unknown } | null>
      >;
    };
    runUnrestricted: jest.MockedFunction<
      (fn: () => Promise<unknown>) => Promise<unknown>
    >;
  };
  let guard: ConsentGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: createKeyedReflectorMock([
        [REQUIRE_CONSENT_KEY, undefined],
      ]),
    };
    prisma = {
      consent: { findMany: jest.fn() },
      clinic: { findUnique: jest.fn() },
      // Mirrors PrismaService.runUnrestricted: establishes the bypassed
      // tenant context for the wrapped read (the real escape hatch the
      // guard-phase fix relies on).
      runUnrestricted: jest.fn(async (fn: () => Promise<unknown>) =>
        tenantStorage.run({ bypassed: true }, fn),
      ),
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
    expect(prisma.consent.findMany).not.toHaveBeenCalled();
  });

  it('allows request when patientId is missing', async () => {
    mockRequiredConsentTypes(reflector.getAllAndOverride, [
      ConsentType.TREATMENT,
    ]);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(prisma.consent.findMany).not.toHaveBeenCalled();
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
    expect(prisma.consent.findMany).not.toHaveBeenCalled();
  });

  it('skips enforcement when there is no clinic context', async () => {
    mockRequiredConsentTypes(reflector.getAllAndOverride, [
      ConsentType.TREATMENT,
    ]);

    await expect(
      guard.canActivate(createContext({ patientId: 'p1' }, null)),
    ).resolves.toBe(true);
    expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
    expect(prisma.consent.findMany).not.toHaveBeenCalled();
  });

  it('allows request when all required consent types are active', async () => {
    mockRequiredConsentTypes(reflector.getAllAndOverride, [
      ConsentType.TREATMENT,
      ConsentType.PROCEDURE,
    ]);
    prisma.consent.findMany.mockResolvedValue([
      { consentType: ConsentType.TREATMENT },
      { consentType: ConsentType.PROCEDURE },
    ]);

    await expect(
      guard.canActivate(createContext({ patientId: 'p1' })),
    ).resolves.toBe(true);
    expect(prisma.consent.findMany).toHaveBeenCalledTimes(1);
  });

  it('blocks request when required consent is missing', async () => {
    mockRequiredConsentTypes(reflector.getAllAndOverride, [
      ConsentType.SURGERY,
    ]);
    prisma.consent.findMany.mockResolvedValue([]);

    await expect(
      guard.canActivate(createContext({ patientId: 'p1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('runs the consent read inside a bypassed tenant context (pins the guard-phase tenant fix)', async () => {
    // Guards run before the TenantContextInterceptor, so without the bypass
    // the tenant Prisma extension throws "Security Violation" (500) on the
    // tenant-scoped Consent read. Pin the escape hatch: the consent lookup
    // must execute with tenant enforcement bypassed (ownership is enforced
    // later in the handler phase via verifyMedicalHistoryPatientAccess).
    mockRequiredConsentTypes(reflector.getAllAndOverride, [
      ConsentType.TREATMENT,
    ]);
    let tenantAtRead: ReturnType<typeof getCurrentTenant>;
    prisma.consent.findMany.mockImplementation(async () => {
      tenantAtRead = getCurrentTenant();
      return [{ consentType: ConsentType.TREATMENT }];
    });

    await expect(
      guard.canActivate(createContext({ patientId: 'p1' })),
    ).resolves.toBe(true);

    expect(tenantAtRead).toEqual(expect.objectContaining({ bypassed: true }));
  });

  it('queries only ACTIVE non-expired consents', async () => {
    mockRequiredConsentTypes(reflector.getAllAndOverride, [
      ConsentType.TELEHEALTH,
    ]);
    prisma.consent.findMany.mockResolvedValue([
      { consentType: ConsentType.TELEHEALTH },
    ]);

    await guard.canActivate(createContext({ patientId: 'patient-1' }));

    expect(prisma.consent.findMany).toHaveBeenCalledWith({
      where: {
        patientId: 'patient-1',
        consentType: { in: [ConsentType.TELEHEALTH] },
        status: 'ACTIVE',
        OR: [{ validUntil: null }, { validUntil: { gt: expect.any(Date) } }],
      },
      select: { consentType: true },
    });
  });
});
