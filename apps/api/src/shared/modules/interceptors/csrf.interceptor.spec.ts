import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CsrfInterceptor } from './csrf.interceptor';

function createContext(
  reqOverrides: Partial<{
    method: string;
    headers: Record<string, string>;
    cookies: Record<string, string>;
  }> = {},
): ExecutionContext {
  const request = {
    method: 'GET',
    headers: {},
    cookies: {},
    ...reqOverrides,
  };
  const response = {
    cookie: jest.fn(),
  };

  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
      getResponse: jest.fn().mockReturnValue(response),
    }),
  } as unknown as ExecutionContext;
}

describe('CsrfInterceptor', () => {
  let interceptor: CsrfInterceptor;
  const appConfigService = {
    isProduction: jest.fn().mockReturnValue(false),
  };
  const next: CallHandler = { handle: () => of({ ok: true }) };

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new CsrfInterceptor(
      appConfigService as unknown as ConstructorParameters<
        typeof CsrfInterceptor
      >[0],
    );
  });

  it('sets CSRF token cookie on safe requests', () => {
    const context = createContext({ method: 'GET' });
    interceptor.intercept(context, next);

    const response = context.switchToHttp().getResponse();
    expect(response.cookie).toHaveBeenCalledTimes(1);
  });

  it('rejects mutating cookie-auth requests without CSRF token', () => {
    const context = createContext({ method: 'POST' });
    expect(() => interceptor.intercept(context, next)).toThrow(
      ForbiddenException,
    );
  });

  it('allows mutating requests with matching CSRF cookie and header', () => {
    const token = 'csrf-token-1';
    const context = createContext({
      method: 'PATCH',
      cookies: { 'XSRF-TOKEN': token },
      headers: { 'x-xsrf-token': token },
    });
    expect(() => interceptor.intercept(context, next)).not.toThrow();
  });

  it('bypasses CSRF checks for bearer-token requests', () => {
    const context = createContext({
      method: 'POST',
      headers: { authorization: 'Bearer token' },
    });
    expect(() => interceptor.intercept(context, next)).not.toThrow();
  });
});
