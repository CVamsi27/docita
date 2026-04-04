import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PasswordExpiredGuard } from './password-expired.guard';

function createContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('PasswordExpiredGuard', () => {
  type UserLookupResult = { passwordExpiresAt: Date | null } | null;
  let reflector: jest.Mocked<Reflector>;
  let prisma: {
    user: {
      findUnique: jest.MockedFunction<
        (...args: unknown[]) => Promise<UserLookupResult>
      >;
    };
  };
  let guard: PasswordExpiredGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<Reflector>;

    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    guard = new PasswordExpiredGuard(
      reflector,
      prisma as unknown as ConstructorParameters<
        typeof PasswordExpiredGuard
      >[1],
    );
  });

  it('uses user.id when user.sub is missing', async () => {
    prisma.user.findUnique.mockResolvedValue({ passwordExpiresAt: null });

    await expect(
      guard.canActivate(createContext({ id: 'user-123' })),
    ).resolves.toBe(true);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      select: { passwordExpiresAt: true },
    });
  });

  it('blocks access when password is expired', async () => {
    prisma.user.findUnique.mockResolvedValue({
      passwordExpiresAt: new Date(Date.now() - 60_000),
    });

    await expect(
      guard.canActivate(createContext({ sub: 'user-456' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('fails closed on lookup errors', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('db unavailable'));
    const loggerWarn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await expect(
      guard.canActivate(createContext({ sub: 'user-789' })),
    ).rejects.toThrow(ForbiddenException);

    loggerWarn.mockRestore();
  });
});
