import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UserRateLimitService } from '@/shared/modules/services/user-rate-limit.service';
import { asType } from '@/test-utils/as-type';
import { UserRateLimitGuard } from './user-rate-limit.guard';

function createContext(user: unknown): ExecutionContext {
  return asType<ExecutionContext>({
    switchToHttp: (() => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => undefined,
    })) as ExecutionContext['switchToHttp'],
  });
}

describe('UserRateLimitGuard', () => {
  let service: jest.Mocked<
    Pick<UserRateLimitService, 'checkRateLimit' | 'getRemainingRequests'>
  >;
  let guard: UserRateLimitGuard;

  beforeEach(() => {
    service = {
      checkRateLimit: jest.fn(),
      getRemainingRequests: jest.fn(),
    };
    guard = new UserRateLimitGuard(asType<UserRateLimitService>(service));
  });

  it('allows request when no authenticated user id is present', () => {
    const allowed = guard.canActivate(createContext({}));
    expect(allowed).toBe(true);
    expect(service.checkRateLimit).not.toHaveBeenCalled();
  });

  it('allows request when user is within rate limit', () => {
    service.checkRateLimit.mockReturnValue(true);

    const allowed = guard.canActivate(createContext({ sub: 'user-1' }));
    expect(allowed).toBe(true);
    expect(service.checkRateLimit).toHaveBeenCalledWith('user-1');
  });

  it('throws when user exceeds rate limit', () => {
    service.checkRateLimit.mockReturnValue(false);
    service.getRemainingRequests.mockReturnValue(0);

    let thrown: HttpException | null = null;
    try {
      guard.canActivate(createContext({ sub: 'user-1' }));
    } catch (error) {
      thrown = error as HttpException;
    }

    expect(thrown).toBeInstanceOf(HttpException);
    expect(thrown?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(thrown?.getResponse()).toEqual({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Too many requests. Please slow down.',
      retryAfter: 60,
      remainingRequests: 0,
    });
  });
});
