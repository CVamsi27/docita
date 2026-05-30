import { Response } from 'express';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { AUTH_CONSTANTS } from '@/shared/modules/config/app-constants';

function getCookieOptions(configService: AppConfigService) {
  const isProduction = configService.isProduction();
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { access_token: string; refresh_token: string },
  configService: AppConfigService,
): void {
  const cookieOptions = getCookieOptions(configService);
  res.cookie('access_token', tokens.access_token, {
    ...cookieOptions,
    maxAge: AUTH_CONSTANTS.ACCESS_TOKEN_MAX_AGE_MS,
  });
  res.cookie('refresh_token', tokens.refresh_token, {
    ...cookieOptions,
    maxAge: AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS,
    path: '/api/v1/auth',
  });
}

/**
 * Removes the raw refresh token from a token bundle before it is returned in a
 * response body. The refresh token is delivered to clients ONLY via the
 * httpOnly cookie ({@link setAuthCookies}); echoing it in the JSON body would
 * let any payload/log leak expose a long-lived (30-day) credential. The browser
 * session manager already refreshes via the cookie (empty body +
 * `credentials: "include"`), so the body field is unused.
 * See docs/compliance/AUTH_HARDENING.md Item 4.
 */
export function stripRefreshTokenFromBody<T extends { refresh_token?: string }>(
  tokens: T,
): Omit<T, 'refresh_token'> {
  const { refresh_token: _refreshToken, ...rest } = tokens;
  return rest;
}

export function clearAuthCookies(
  res: Response,
  configService: AppConfigService,
): void {
  const cookieOptions = getCookieOptions(configService);
  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', {
    ...cookieOptions,
    path: '/api/v1/auth',
  });
}
