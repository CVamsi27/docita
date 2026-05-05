import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/db';
import { TenantRateLimitGuard } from './tenant-rate-limit.guard';
import {
  RATE_LIMIT_HEADER_LIMIT,
  RATE_LIMIT_HEADER_REMAINING,
  RATE_LIMIT_HEADER_RESET,
} from './tenant-rate-limit.constants';
import type { TenantRateLimitService } from './tenant-rate-limit.service';
import type { RateLimitDecision } from './tenant-rate-limit.types';

const buildContext = (
  user: { clinicId?: string | null; role?: Role | string } | undefined,
  setHeader: jest.Mock,
): ExecutionContext => {
  const req = { user };
  const res = { setHeader };
  return {
    getType: () => 'http',
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
};

describe('TenantRateLimitGuard', () => {
  let setHeader: jest.Mock;
  let service: TenantRateLimitService;
  let checkAndConsume: jest.Mock<
    (clinicId: string) => Promise<RateLimitDecision[]>
  >;
  let reflector: Reflector;

  beforeEach(() => {
    setHeader = jest.fn();
    checkAndConsume = jest.fn(async () => [
      {
        allowed: true,
        limit: 50,
        remaining: 49,
        resetSeconds: 1,
        windowMs: 1000,
        reason: 'burst',
      } satisfies RateLimitDecision,
    ]);
    service = {
      checkAndConsume,
    } as unknown as TenantRateLimitService;
    reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
  });

  it('skips when no authenticated user is present', async () => {
    const guard = new TenantRateLimitGuard(reflector, service);
    const allowed = await guard.canActivate(buildContext(undefined, setHeader));
    expect(allowed).toBe(true);
    expect(checkAndConsume).not.toHaveBeenCalled();
  });

  it('skips for INTERNAL role', async () => {
    const guard = new TenantRateLimitGuard(reflector, service);
    const allowed = await guard.canActivate(
      buildContext({ clinicId: 'c1', role: Role.INTERNAL }, setHeader),
    );
    expect(allowed).toBe(true);
    expect(checkAndConsume).not.toHaveBeenCalled();
  });

  it('skips when handler is marked public', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(true);
    const guard = new TenantRateLimitGuard(reflector, service);
    const allowed = await guard.canActivate(
      buildContext({ clinicId: 'c1', role: Role.DOCTOR }, setHeader),
    );
    expect(allowed).toBe(true);
    expect(checkAndConsume).not.toHaveBeenCalled();
  });

  it('writes X-RateLimit headers when allowed', async () => {
    const guard = new TenantRateLimitGuard(reflector, service);
    await guard.canActivate(
      buildContext({ clinicId: 'c1', role: Role.DOCTOR }, setHeader),
    );
    expect(setHeader).toHaveBeenCalledWith(RATE_LIMIT_HEADER_LIMIT, '50');
    expect(setHeader).toHaveBeenCalledWith(RATE_LIMIT_HEADER_REMAINING, '49');
    expect(setHeader).toHaveBeenCalledWith(RATE_LIMIT_HEADER_RESET, '1');
  });

  it('throws 429 with the blocking window when burst exceeded', async () => {
    checkAndConsume.mockResolvedValueOnce([
      {
        allowed: false,
        limit: 50,
        remaining: 0,
        resetSeconds: 1,
        windowMs: 1000,
        reason: 'burst',
      },
    ]);
    const guard = new TenantRateLimitGuard(reflector, service);
    await expect(
      guard.canActivate(
        buildContext({ clinicId: 'c1', role: Role.DOCTOR }, setHeader),
      ),
    ).rejects.toBeInstanceOf(HttpException);
    expect(setHeader).toHaveBeenCalledWith(RATE_LIMIT_HEADER_LIMIT, '50');
    expect(setHeader).toHaveBeenCalledWith(RATE_LIMIT_HEADER_REMAINING, '0');
  });

  it('throws 429 with monthly window when monthly cap exceeded', async () => {
    checkAndConsume.mockResolvedValueOnce([
      {
        allowed: false,
        limit: 1_000,
        remaining: 0,
        resetSeconds: 86_400,
        windowMs: 86_400_000,
        reason: 'monthly',
      },
    ]);
    const guard = new TenantRateLimitGuard(reflector, service);
    try {
      await guard.canActivate(
        buildContext({ clinicId: 'c1', role: Role.DOCTOR }, setHeader),
      );
      throw new Error('expected guard to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(429);
      const body = httpErr.getResponse() as { window?: string };
      expect(body.window).toBe('monthly');
    }
  });
});
