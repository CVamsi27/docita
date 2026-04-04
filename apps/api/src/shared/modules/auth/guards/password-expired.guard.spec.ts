import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { asType } from '@/test-utils/as-type';
import { PasswordExpiredGuard } from './password-expired.guard';

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

describe('PasswordExpiredGuard', () => {
  type UserLookupResult = { passwordExpiresAt: Date | null } | null;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let prisma: {
    $queryRaw: jest.MockedFunction<
      (...args: unknown[]) => Promise<UserLookupResult[]>
    >;
  };
  let guard: PasswordExpiredGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };

    prisma = {
      $queryRaw: jest.fn(),
    };

    guard = new PasswordExpiredGuard(
      asType<Reflector>(reflector),
      asType<ConstructorParameters<typeof PasswordExpiredGuard>[1]>(prisma),
    );
  });

  it('uses user.id when user.sub is missing', async () => {
    prisma.$queryRaw.mockResolvedValue([{ passwordExpiresAt: null }]);

    await expect(
      guard.canActivate(createContext({ id: 'user-123' })),
    ).resolves.toBe(true);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('skips guard when skip metadata is enabled', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(
      guard.canActivate(createContext({ sub: 'user-123' })),
    ).resolves.toBe(true);

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('allows request when authenticated user id is missing', async () => {
    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('blocks access when password is expired', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { passwordExpiresAt: new Date(Date.now() - 60_000) },
    ]);

    await expect(
      guard.canActivate(createContext({ sub: 'user-456' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('fails closed on lookup errors', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('db unavailable'));
    const loggerWarn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await expect(
      guard.canActivate(createContext({ sub: 'user-789' })),
    ).rejects.toThrow(ForbiddenException);

    loggerWarn.mockRestore();
  });
});
