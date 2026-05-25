import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ClinicTier } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { asType } from '@/test-utils';
import { FrontDeskClinicalBlockGuard } from './front-desk-clinical-block.guard';

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
  const findUnique = jest.fn(
    async (): Promise<{ tier?: ClinicTier } | null> => null,
  );

  beforeEach(() => {
    findUnique.mockReset();
    const prisma = {
      clinic: { findUnique },
    } as unknown as PrismaService;
    guard = new FrontDeskClinicalBlockGuard(prisma);
  });

  it('allows GET without loading clinic tier', async () => {
    await expect(
      guard.canActivate(
        createContext({ method: 'GET', user: { clinicId: 'c1' } }),
      ),
    ).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('allows mutating methods when tier is not FRONT_DESK', async () => {
    findUnique.mockImplementation(async () => ({
      tier: ClinicTier.PROFESSIONAL,
    }));
    await expect(
      guard.canActivate(
        createContext({ method: 'POST', user: { clinicId: 'c1' } }),
      ),
    ).resolves.toBe(true);
  });

  it.each([
    ClinicTier.FRONT_DESK,
    ClinicTier.FRONT_DESK_CLINIC,
    ClinicTier.FRONT_DESK_HOSPITAL,
  ])('forbids mutating methods on %s tier', async (tier) => {
    findUnique.mockImplementation(async () => ({ tier }));
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
    expect(findUnique).not.toHaveBeenCalled();
  });
});
