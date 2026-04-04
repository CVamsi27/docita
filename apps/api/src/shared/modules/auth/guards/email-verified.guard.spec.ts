import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EmailVerifiedGuard } from './email-verified.guard';

function createContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('EmailVerifiedGuard', () => {
  type UserLookupResult = { emailVerified: boolean } | null;
  let reflector: jest.Mocked<Reflector>;
  let prisma: {
    user: {
      findUnique: jest.MockedFunction<
        (...args: unknown[]) => Promise<UserLookupResult>
      >;
    };
  };
  let guard: EmailVerifiedGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<Reflector>;
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    guard = new EmailVerifiedGuard(
      reflector,
      prisma as unknown as ConstructorParameters<typeof EmailVerifiedGuard>[1],
    );
  });

  it('uses user.id when sub is missing', async () => {
    prisma.user.findUnique.mockResolvedValue({ emailVerified: true });

    await expect(
      guard.canActivate(createContext({ id: 'user-123' })),
    ).resolves.toBe(true);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      select: { emailVerified: true },
    });
  });

  it('blocks unverified users', async () => {
    prisma.user.findUnique.mockResolvedValue({ emailVerified: false });

    await expect(
      guard.canActivate(createContext({ sub: 'user-123' })),
    ).rejects.toThrow(ForbiddenException);
  });
});
