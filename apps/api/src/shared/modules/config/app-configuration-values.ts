import type { EnvConfig } from './app-config';
import {
  parseHostname,
  resolveSharedCookieDomain,
} from './app-config-url.helpers';

export function getSharedCookieDomainFromConfig(config: EnvConfig) {
  if (config.NODE_ENV !== 'production') return undefined;

  const frontendHostname = parseHostname(config.FRONTEND_URL);
  const apiHostname = parseHostname(config.API_PUBLIC_URL);
  const appHostname = parseHostname(config.APP_URL);
  const frontendApiDomain = resolveSharedCookieDomain(
    [frontendHostname, apiHostname].filter((hostname): hostname is string =>
      Boolean(hostname),
    ),
  );

  return (
    frontendApiDomain ??
    resolveSharedCookieDomain(
      [appHostname, frontendHostname, apiHostname].filter(
        (hostname): hostname is string => Boolean(hostname),
      ),
    )
  );
}

export function shouldBypassGuardForE2eConfig({
  isProduction,
  apiE2eEnabled,
  e2eHeaderValue,
}: {
  isProduction: boolean;
  apiE2eEnabled: boolean;
  e2eHeaderValue: string | undefined;
}) {
  if (isProduction) return false;
  if (apiE2eEnabled) return true;
  return e2eHeaderValue === 'true';
}

export function getEmailSenderDomainFromEmail(from: string) {
  const match = from.match(/@([^>\s]+)/);
  return (match?.[1] ?? '').trim().toLowerCase();
}

export function parseInternalAllowedEmails(raw: string | undefined) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function getJwtSecretFromConfig({
  jwtSecret,
  workerEntrypoint,
  workerPlaceholderSecret,
}: {
  jwtSecret: string | undefined;
  workerEntrypoint: string;
  workerPlaceholderSecret: string;
}) {
  if (jwtSecret) return jwtSecret;
  if (workerEntrypoint === 'worker') return workerPlaceholderSecret;
  throw new Error('JWT_SECRET is required for API runtime');
}

export function getRequiredRedisUrl(redisUrl: string | undefined) {
  if (!redisUrl)
    throw new Error('REDIS_URL is required when CACHE_BACKEND=redis');
  return redisUrl;
}
