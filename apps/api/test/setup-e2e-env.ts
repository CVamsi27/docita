/**
 * Loaded only by `jest-e2e.json` after `setup-env.ts`.
 * Disables auth IP rate limiting for the in-process E2E app so sequential
 * logins from a single client IP do not hit production limits (see IpRateLimitGuard).
 */
process.env.DOCITA_API_E2E = 'true';
