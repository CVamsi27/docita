import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { asType } from '@/test-utils/as-type';
import { mockGetAllAndOverrideKeyBranch } from '@/test-utils/mock-reflector-get-all-and-override';
import { IS_PUBLIC_KEY } from './public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

function createContext(): ExecutionContext {
  return asType<ExecutionContext>({
    getHandler: (() => () => undefined) as ExecutionContext['getHandler'],
    getClass: (() => class TestClass {}) as ExecutionContext['getClass'],
  });
}

describe('JwtAuthGuard', () => {
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new JwtAuthGuard(asType<Reflector>(reflector));
  });

  it('allows public routes without invoking passport guard', () => {
    mockGetAllAndOverrideKeyBranch(
      reflector.getAllAndOverride,
      IS_PUBLIC_KEY,
      true,
      false,
    );

    const parentCanActivate = jest.spyOn(
      Object.getPrototypeOf(JwtAuthGuard.prototype),
      'canActivate',
    );

    const allowed = guard.canActivate(createContext());
    expect(allowed).toBe(true);
    expect(parentCanActivate).not.toHaveBeenCalled();

    parentCanActivate.mockRestore();
  });

  it('delegates to passport guard for non-public routes', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const parentCanActivate = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);

    const allowed = guard.canActivate(createContext());
    expect(allowed).toBe(true);
    expect(parentCanActivate).toHaveBeenCalledTimes(1);

    parentCanActivate.mockRestore();
  });
});
