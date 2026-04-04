import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { asType } from '@/test-utils/as-type';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { SKIP_EMAIL_VERIFICATION_KEY } from './email-verified.guard';
import { EmailVerifiedGuard } from './email-verified.guard';

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

describe('EmailVerifiedGuard', () => {
  type UserLookupResult = { emailVerified: boolean } | null;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let prisma: {
    $queryRaw: jest.MockedFunction<
      (...args: unknown[]) => Promise<UserLookupResult[]>
    >;
  };
  let guard: EmailVerifiedGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    prisma = {
      $queryRaw: jest.fn(),
    };
    guard = new EmailVerifiedGuard(
      asType<Reflector>(reflector),
      asType<ConstructorParameters<typeof EmailVerifiedGuard>[1]>(prisma),
    );
  });

  it('uses user.id when sub is missing', async () => {
    prisma.$queryRaw.mockResolvedValue([{ emailVerified: true }]);

    await expect(
      guard.canActivate(createContext({ id: 'user-123' })),
    ).resolves.toBe(true);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('blocks unverified users', async () => {
    prisma.$queryRaw.mockResolvedValue([{ emailVerified: false }]);

    await expect(
      guard.canActivate(createContext({ sub: 'user-123' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('skips verification for public routes', async () => {
    reflector.getAllAndOverride.mockImplementation((key: unknown) => {
      if (key === IS_PUBLIC_KEY) return true;
      return false;
    });

    await expect(
      guard.canActivate(createContext({ sub: 'user-123' })),
    ).resolves.toBe(true);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('skips verification when skip metadata is set', async () => {
    reflector.getAllAndOverride.mockImplementation((key: unknown) => {
      if (key === SKIP_EMAIL_VERIFICATION_KEY) return true;
      return false;
    });

    await expect(
      guard.canActivate(createContext({ sub: 'user-123' })),
    ).resolves.toBe(true);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('fails closed on lookup errors', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('db unavailable'));

    await expect(
      guard.canActivate(createContext({ sub: 'user-123' })),
    ).rejects.toThrow(ForbiddenException);
  });
});
