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
  nodeEnv,
  apiE2eEnabled,
  e2eHeaderValue,
}: {
  nodeEnv: string;
  apiE2eEnabled: boolean;
  e2eHeaderValue: string | undefined;
}) {
  // Production and staging are internet-facing: never honor an attacker-set
  // header, and never allow the DOCITA_API_E2E switch to open a full bypass
  // (security-review VULN-001 — the header alone must not disable the auth
  // rate limiters / email-verified gate on a deployed environment).
  if (nodeEnv === 'production' || nodeEnv === 'staging') return false;
  // DOCITA_API_E2E=true is the explicit operator switch; the e2e suites set
  // it in test/setup-e2e-env.ts. Local dev can opt in deliberately.
  if (apiE2eEnabled) return true;
  // The x-docita-e2e header is honored ONLY under `test`, where the API
  // e2e suite runs (api-e2e.yml sets NODE_ENV=test).
  if (nodeEnv === 'test') return e2eHeaderValue === 'true';
  return false;
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
