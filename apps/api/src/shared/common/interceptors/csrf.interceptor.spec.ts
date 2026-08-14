import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CsrfInterceptor } from '@/shared/common/interceptors/csrf.interceptor';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

function createContext(
  reqOverrides: Partial<{
    method: string;
    headers: Record<string, string>;
    cookies: Record<string, string>;
    url: string;
    originalUrl: string;
  }> = {},
): ExecutionContext {
  const request = {
    method: 'GET',
    headers: {},
    cookies: {},
    url: '/api/v1/patients',
    originalUrl: '/api/v1/patients',
    ...reqOverrides,
  };
  const response = {
    cookie: jest.fn(),
    setHeader: jest.fn(),
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
  appConfigService.getSharedCookieDomain = jest
    .fn<() => string | undefined>()
    .mockReturnValue(undefined);
  const next: CallHandler = { handle: () => of({ ok: true }) };

  beforeEach(() => {
    jest.clearAllMocks();
    (
      appConfigService.isProduction as jest.MockedFunction<
        typeof appConfigService.isProduction
      >
    ).mockReturnValue(false);
    (
      appConfigService.getSharedCookieDomain as jest.MockedFunction<
        typeof appConfigService.getSharedCookieDomain
      >
    ).mockReturnValue(undefined);
    interceptor = new CsrfInterceptor(appConfigService);
  });

  it('sets CSRF token cookie on safe requests', () => {
    const context = createContext({ method: 'GET' });
    interceptor.intercept(context, next);

    const response = context.switchToHttp().getResponse();
    expect(response.cookie).toHaveBeenCalledTimes(1);
    expect(response.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({
        path: '/',
        sameSite: 'strict',
        httpOnly: true,
      }),
    );
  });

  it('re-issues CSRF cookie on safe requests even when one exists', () => {
    const token = 'csrf-token-existing';
    const context = createContext({
      method: 'GET',
      cookies: { 'XSRF-TOKEN': token },
    });
    interceptor.intercept(context, next);

    const response = context.switchToHttp().getResponse();
    expect(response.cookie).toHaveBeenCalledTimes(1);
    expect(response.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      token,
      expect.objectContaining({ path: '/', sameSite: 'strict' }),
    );
  });

  it('uses the shared cookie domain for production subdomains', () => {
    (
      appConfigService.isProduction as jest.MockedFunction<
        typeof appConfigService.isProduction
      >
    ).mockReturnValue(true);
    (
      appConfigService.getSharedCookieDomain as jest.MockedFunction<
        typeof appConfigService.getSharedCookieDomain
      >
    ).mockReturnValue('docita.work');

    const context = createContext({ method: 'GET' });
    interceptor.intercept(context, next);

    const response = context.switchToHttp().getResponse();
    expect(response.cookie).toHaveBeenCalledTimes(2);
    expect(response.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({
        domain: 'docita.work',
        secure: true,
      }),
    );
  });

  it('rejects mutating cookie-auth requests without CSRF token', () => {
    const context = createContext({ method: 'POST' });
    expect(() => interceptor.intercept(context, next)).toThrow(
      ForbiddenException,
    );
  });

  it('re-issues a fresh CSRF token on rejection so the client can retry', () => {
    const context = createContext({
      method: 'POST',
      cookies: { 'XSRF-TOKEN': 'server-token' },
      headers: { 'x-xsrf-token': 'mismatched-token' },
    });
    expect(() => interceptor.intercept(context, next)).toThrow(
      ForbiddenException,
    );

    const response = context.switchToHttp().getResponse();
    // A new token is minted and exposed on the rejection response so a
    // legitimate client that never warmed its token can recover and replay.
    expect(response.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({ path: '/', httpOnly: true }),
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-CSRF-Token',
      expect.any(String),
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

  it('allows first-touch public auth mutations and seeds CSRF cookie', () => {
    const context = createContext({
      method: 'POST',
      url: '/api/v1/auth/login',
      originalUrl: '/api/v1/auth/login',
    });
    expect(() => interceptor.intercept(context, next)).not.toThrow();

    const response = context.switchToHttp().getResponse();
    expect(response.cookie).toHaveBeenCalledTimes(1);
  });

  it('allows auth mutations when a stale CSRF cookie exists but no auth cookie is present', () => {
    const context = createContext({
      method: 'POST',
      url: '/api/v1/auth/login',
      originalUrl: '/api/v1/auth/login',
      cookies: { 'XSRF-TOKEN': 'stale-token' },
    });

    expect(() => interceptor.intercept(context, next)).not.toThrow();
  });

  it('seeds host-only and shared-domain CSRF cookies for first-touch auth mutations in production', () => {
    (
      appConfigService.isProduction as jest.MockedFunction<
        typeof appConfigService.isProduction
      >
    ).mockReturnValue(true);
    (
      appConfigService.getSharedCookieDomain as jest.MockedFunction<
        typeof appConfigService.getSharedCookieDomain
      >
    ).mockReturnValue('docita.work');

    const context = createContext({
      method: 'POST',
      url: '/api/v1/auth/login',
      originalUrl: '/api/v1/auth/login',
    });

    expect(() => interceptor.intercept(context, next)).not.toThrow();

    const response = context.switchToHttp().getResponse();
    expect(response.cookie).toHaveBeenCalledTimes(2);
    expect(response.cookie).toHaveBeenNthCalledWith(
      1,
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({
        path: '/',
        sameSite: 'strict',
        secure: true,
        httpOnly: true,
      }),
    );
    expect(response.cookie).toHaveBeenNthCalledWith(
      2,
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({
        path: '/',
        sameSite: 'strict',
        secure: true,
        httpOnly: true,
        domain: 'docita.work',
      }),
    );
    expect(
      (
        response.cookie as jest.MockedFunction<
          (name: string, value: string, options: unknown) => void
        >
      ).mock.calls[0]?.[1],
    ).toBe(
      (
        response.cookie as jest.MockedFunction<
          (name: string, value: string, options: unknown) => void
        >
      ).mock.calls[1]?.[1],
    );
  });

  it('rejects auth mutations without CSRF token when auth cookies are present', () => {
    const context = createContext({
      method: 'POST',
      url: '/api/v1/auth/logout',
      originalUrl: '/api/v1/auth/logout',
      cookies: { refresh_token: 'refresh-token' },
    });
    expect(() => interceptor.intercept(context, next)).toThrow(
      ForbiddenException,
    );
  });

  it('bypasses CSRF checks for bearer-token requests', () => {
    const context = createContext({
      method: 'POST',
      headers: { authorization: 'Bearer token' },
    });
    expect(() => interceptor.intercept(context, next)).not.toThrow();
  });

  it('bootstraps CSRF for pre-auth endpoints even when stale session cookies are present', () => {
    // Repro: DB reset / forced revocation leaves the browser holding old
    // access_token & refresh_token cookies. The user then tries to log in;
    // /auth/check-email is by definition pre-session so it must still bootstrap.
    const context = createContext({
      method: 'POST',
      url: '/api/v1/auth/check-email',
      originalUrl: '/api/v1/auth/check-email',
      cookies: {
        access_token: 'stale-access',
        refresh_token: 'stale-refresh',
      },
    });
    expect(() => interceptor.intercept(context, next)).not.toThrow();
  });

  it('still rejects mutations on session-bound auth endpoints when cookies are present without CSRF', () => {
    // /auth/logout and /auth/refresh stay strict — the CSRF header is required.
    const context = createContext({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      originalUrl: '/api/v1/auth/refresh',
      cookies: { refresh_token: 'refresh-token' },
    });
    expect(() => interceptor.intercept(context, next)).toThrow(
      ForbiddenException,
    );
  });

  it('allows unauthenticated POST to monitoring web-vitals without CSRF', () => {
    const context = createContext({
      method: 'POST',
      url: '/api/v1/monitoring/web-vitals',
      originalUrl: '/api/v1/monitoring/web-vitals',
    });
    expect(() => interceptor.intercept(context, next)).not.toThrow();
  });

  it('allows signature-authenticated webhook ingress without CSRF', () => {
    // Provider callbacks (Razorpay/ZeptoMail/WhatsApp) are POSTed without a
    // browser session and are authenticated by their own HMAC verification +
    // replay dedupe — the CSRF double-submit must not block them.
    const context = createContext({
      method: 'POST',
      url: '/api/v1/webhooks/subscriptions/razorpay',
      originalUrl: '/api/v1/webhooks/subscriptions/razorpay',
    });
    expect(() => interceptor.intercept(context, next)).not.toThrow();
  });

  it('still rejects non-webhook mutating requests without CSRF', () => {
    // Guard against over-broadening the webhook exemption.
    const context = createContext({
      method: 'POST',
      url: '/api/v1/webhooks-like-route',
      originalUrl: '/api/v1/webhooks-like-route',
    });
    expect(() => interceptor.intercept(context, next)).toThrow(
      ForbiddenException,
    );
  });
});
