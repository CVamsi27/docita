import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  asType,
  createKeyedReflectorMock,
  mockGetAllAndOverrideKeyBranch,
  type MockedReflectorGetAllAndOverride,
} from '@/test-utils';
import type { IUserRepository } from '@/domains/users/core/repositories/user.repository.interface';
import type { IClock } from '@/shared/common/ports/clock.port';
import {
  PasswordExpiredGuard,
  SKIP_PASSWORD_EXPIRY_KEY,
} from './password-expired.guard';

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
  let reflector: { getAllAndOverride: MockedReflectorGetAllAndOverride };
  let users: {
    findPasswordExpiresAt: jest.MockedFunction<
      IUserRepository['findPasswordExpiresAt']
    >;
  };
  let clock: IClock;
  let guard: PasswordExpiredGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: createKeyedReflectorMock([
        [SKIP_PASSWORD_EXPIRY_KEY, false],
      ]),
    };

    users = {
      findPasswordExpiresAt: jest.fn(),
    };

    clock = {
      now: () => new Date('2026-05-19T12:00:00.000Z'),
    };

    guard = new PasswordExpiredGuard(
      asType<Reflector>(reflector),
      asType<IUserRepository>(users),
      clock,
    );
  });

  it('uses user.id when user.sub is missing', async () => {
    users.findPasswordExpiresAt.mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext({ id: 'user-123' })),
    ).resolves.toBe(true);

    expect(users.findPasswordExpiresAt).toHaveBeenCalledWith('user-123');
  });

  it('skips guard when skip metadata is enabled', async () => {
    mockGetAllAndOverrideKeyBranch(
      reflector.getAllAndOverride,
      SKIP_PASSWORD_EXPIRY_KEY,
      true,
      false,
    );

    await expect(
      guard.canActivate(createContext({ sub: 'user-123' })),
    ).resolves.toBe(true);

    expect(users.findPasswordExpiresAt).not.toHaveBeenCalled();
  });

  it('allows request when authenticated user id is missing', async () => {
    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(users.findPasswordExpiresAt).not.toHaveBeenCalled();
  });

  it('blocks access when password is expired', async () => {
    users.findPasswordExpiresAt.mockResolvedValue(
      new Date('2026-05-18T12:00:00.000Z'),
    );

    await expect(
      guard.canActivate(createContext({ sub: 'user-456' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('fails closed on lookup errors', async () => {
    users.findPasswordExpiresAt.mockRejectedValue(new Error('db unavailable'));
    const loggerWarn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await expect(
      guard.canActivate(createContext({ sub: 'user-789' })),
    ).rejects.toThrow(ForbiddenException);

    loggerWarn.mockRestore();
  });
});
