type JwtDuration = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

const JWT_DURATION_PATTERN = /^\d+[smhdwy]$/;
const BARE_SECONDS_PATTERN = /^\d+$/;

function isJwtDuration(value: string): value is JwtDuration {
  return JWT_DURATION_PATTERN.test(value);
}

/**
 * Resolve a configured JWT expiration string to the value `@nestjs/jwt`
 * `signOptions.expiresIn` accepts: bare digits become seconds (`"900"` →
 * 900), suffixed values pass through as duration literals (`"12h"` →
 * `"12h"`), and anything unparseable falls back (default `"7d"`).
 */
export function resolveJwtExpiresIn(
  value: string,
  fallback: JwtDuration = '7d',
): JwtDuration | number {
  if (BARE_SECONDS_PATTERN.test(value)) return Number(value);
  if (isJwtDuration(value)) return value;
  return fallback;
}
