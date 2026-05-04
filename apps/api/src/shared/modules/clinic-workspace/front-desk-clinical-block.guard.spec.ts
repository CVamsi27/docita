import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
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
    async (): Promise<{ settings?: Record<string, unknown> } | null> => null,
  );

  beforeEach(() => {
    findUnique.mockReset();
    const prisma = {
      clinic: { findUnique },
    } as unknown as PrismaService;
    guard = new FrontDeskClinicalBlockGuard(prisma);
  });

  it('allows GET without loading clinic settings', async () => {
    await expect(
      guard.canActivate(
        createContext({ method: 'GET', user: { clinicId: 'c1' } }),
      ),
    ).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('allows mutating methods when workspace is full clinical', async () => {
    findUnique.mockImplementation(async () => ({
      settings: { workspaceProfile: 'FULL_CLINICAL' },
    }));
    await expect(
      guard.canActivate(
        createContext({ method: 'POST', user: { clinicId: 'c1' } }),
      ),
    ).resolves.toBe(true);
  });

  it('forbids mutating methods when workspace is FRONT_DESK', async () => {
    findUnique.mockImplementation(async () => ({
      settings: { workspaceProfile: 'FRONT_DESK' },
    }));
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
