import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  asType,
  mockGetAllAndOverrideKeyBranch,
  mockGetAllAndOverrideKeyMap,
} from '@/test-utils';
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
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let guard: EmailVerifiedGuard;

  beforeEach(() => {
    const getAllAndOverride = jest.fn() as jest.MockedFunction<
      Reflector['getAllAndOverride']
    >;
    mockGetAllAndOverrideKeyMap(getAllAndOverride, [
      [IS_PUBLIC_KEY, false],
      [SKIP_EMAIL_VERIFICATION_KEY, false],
    ]);
    reflector = {
      getAllAndOverride,
    };
    guard = new EmailVerifiedGuard(asType<Reflector>(reflector));
  });

  it('allows verified users', () => {
    expect(
      guard.canActivate(createContext({ id: 'user-123', emailVerified: true })),
    ).toBe(true);
  });

  it('uses user.id when sub is missing', () => {
    expect(
      guard.canActivate(createContext({ id: 'user-123', emailVerified: true })),
    ).toBe(true);
  });

  it('blocks unverified users', () => {
    expect(() =>
      guard.canActivate(
        createContext({ sub: 'user-123', emailVerified: false }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('skips verification for public routes', () => {
    mockGetAllAndOverrideKeyBranch(
      reflector.getAllAndOverride,
      IS_PUBLIC_KEY,
      true,
      false,
    );

    expect(
      guard.canActivate(
        createContext({ sub: 'user-123', emailVerified: false }),
      ),
    ).toBe(true);
  });

  it('skips verification when skip metadata is set', () => {
    mockGetAllAndOverrideKeyBranch(
      reflector.getAllAndOverride,
      SKIP_EMAIL_VERIFICATION_KEY,
      true,
      false,
    );

    expect(
      guard.canActivate(
        createContext({ sub: 'user-123', emailVerified: false }),
      ),
    ).toBe(true);
  });

  it('allows unauthenticated requests (no userId)', () => {
    expect(guard.canActivate(createContext(null))).toBe(true);
    expect(guard.canActivate(createContext({}))).toBe(true);
  });

  it('allows requests where emailVerified is not set', () => {
    // emailVerified undefined means JWT strategy did not set it — allow through
    expect(guard.canActivate(createContext({ sub: 'user-123' }))).toBe(true);
  });
});
