/**
 * Shared k6 helpers. Values come from environment so we can run the
 * same scripts against `localhost`, staging, and a private perf
 * environment without code changes.
 *
 *   K6_BASE_URL          base URL of the API (default http://localhost:3001)
 *   K6_AUTH_TOKEN        pre-issued JWT for authenticated scenarios
 *   K6_TENANT_ID         clinic id for tenant-scoped requests
 *   K6_WEBHOOK_SECRET    HMAC secret for the webhook scenario
 *
 * No PHI is ever sent. Use seeded synthetic clinic + patient ids only.
 */

import crypto from 'k6/crypto';

export const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3001';
export const AUTH_TOKEN = __ENV.K6_AUTH_TOKEN || '';
export const TENANT_ID = __ENV.K6_TENANT_ID || '';
export const WEBHOOK_SECRET = __ENV.K6_WEBHOOK_SECRET || '';

export function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    Authorization: AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : '',
    'X-Tenant-Id': TENANT_ID,
    ...extra,
  };
}

/**
 * Generates a UUIDv4-like string suitable for Idempotency-Key headers.
 * k6 has no built-in UUID; this is good enough for load tests since we
 * only need uniqueness across the run.
 */
export function uuid() {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i += 1) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-';
    } else if (i === 14) {
      out += '4';
    } else if (i === 19) {
      out += hex[((Math.random() * 4) | 0) + 8];
    } else {
      out += hex[(Math.random() * 16) | 0];
    }
  }
  return out;
}

/** Produces an HMAC-SHA256 signature compatible with WebhookVerifierService. */
export function signWebhook(rawBody, timestamp) {
  const payload = `${timestamp}.${rawBody}`;
  return crypto.hmac('sha256', WEBHOOK_SECRET, payload, 'hex');
}
