import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IpRateLimitService } from '@/shared/modules/services/ip-rate-limit.service';
import { asType } from '@/test-utils/as-type';
import { IpRateLimitGuard } from './ip-rate-limit.guard';

type RequestWithClientIp = Request & { clientIp?: string };

function createContext(request: RequestWithClientIp): ExecutionContext {
  return asType<ExecutionContext>({
    switchToHttp: (() => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    })) as ExecutionContext['switchToHttp'],
  });
}

describe('IpRateLimitGuard', () => {
  let service: jest.Mocked<
    Pick<
      IpRateLimitService,
      'getClientIp' | 'checkRateLimit' | 'getRemainingBanTime'
    >
  >;
  let guard: IpRateLimitGuard;

  beforeEach(() => {
    service = {
      getClientIp: jest.fn(),
      checkRateLimit: jest.fn(),
      getRemainingBanTime: jest.fn(),
    };
    guard = new IpRateLimitGuard(asType<IpRateLimitService>(service));
  });

  it('allows request and stores client ip when rate limit is not exceeded', () => {
    const request = { headers: {} } as RequestWithClientIp;
    service.getClientIp.mockReturnValue('127.0.0.1');
    service.checkRateLimit.mockReturnValue(true);

    const allowed = guard.canActivate(createContext(request));

    expect(allowed).toBe(true);
    expect(request.clientIp).toBe('127.0.0.1');
  });

  it('throws blocked response when IP is currently banned', () => {
    service.getClientIp.mockReturnValue('127.0.0.2');
    service.checkRateLimit.mockReturnValue(false);
    service.getRemainingBanTime.mockReturnValue(120);

    let thrown: HttpException | null = null;
    try {
      guard.canActivate(createContext({ headers: {} } as RequestWithClientIp));
    } catch (error) {
      thrown = error as HttpException;
    }

    expect(thrown).toBeInstanceOf(HttpException);
    expect(thrown?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(thrown?.message).toContain('temporarily blocked');
  });

  it('throws generic throttle response when limit is exceeded without ban', () => {
    service.getClientIp.mockReturnValue('127.0.0.3');
    service.checkRateLimit.mockReturnValue(false);
    service.getRemainingBanTime.mockReturnValue(0);

    let thrown: HttpException | null = null;
    try {
      guard.canActivate(createContext({ headers: {} } as RequestWithClientIp));
    } catch (error) {
      thrown = error as HttpException;
    }

    expect(thrown).toBeInstanceOf(HttpException);
    expect(thrown?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(thrown?.message).toContain('Too many authentication attempts');
  });
});
