import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConsentType } from '@workspace/db';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { asType, mockGetAllAndOverrideKeyMap } from '@/test-utils';
import { ConsentGuard, REQUIRE_CONSENT_KEY } from './consent.guard';

function createContext(params: Record<string, string>): ExecutionContext {
  return asType<ExecutionContext>({
    switchToHttp: (() => ({
      getRequest: () => ({ params }),
      getResponse: () => ({}),
      getNext: () => undefined,
    })) as ExecutionContext['switchToHttp'],
    getHandler: (() => () => undefined) as ExecutionContext['getHandler'],
    getClass: (() => class TestClass {}) as ExecutionContext['getClass'],
  });
}

function mockRequiredConsentTypes(
  mock: jest.MockedFunction<Reflector['getAllAndOverride']>,
  types: ConsentType[] | undefined,
): void {
  mockGetAllAndOverrideKeyMap(mock, [[REQUIRE_CONSENT_KEY, types]]);
}

describe('ConsentGuard', () => {
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let prisma: {
    consent: {
      findFirst: jest.MockedFunction<
        (...args: unknown[]) => Promise<{ id: string } | null>
      >;
    };
  };
  let guard: ConsentGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    prisma = {
      consent: {
        findFirst: jest.fn(),
      },
    };
    guard = new ConsentGuard(
      asType<Reflector>(reflector),
      asType<ConstructorParameters<typeof ConsentGuard>[1]>(prisma),
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
