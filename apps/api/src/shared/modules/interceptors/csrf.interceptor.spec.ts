import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CsrfInterceptor } from './csrf.interceptor';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

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

  const context = new ExecutionContextHost([request, response, undefined]);
  context.setType('http');
  return context;
}

describe('CsrfInterceptor', () => {
  let interceptor: CsrfInterceptor;
  const appConfigService = Object.create(
    AppConfigService.prototype,
  ) as AppConfigService;
  appConfigService.isProduction = jest
    .fn<() => boolean>()
    .mockReturnValue(false);
  const next: CallHandler = { handle: () => of({ ok: true }) };

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new CsrfInterceptor(appConfigService);
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
