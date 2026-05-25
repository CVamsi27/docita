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
