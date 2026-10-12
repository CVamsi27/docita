import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { RouteCategory } from '@workspace/db';
import {
  HEALTH_PATH_REGEX_SOURCE,
  INTERNAL_PATH_REGEX_SOURCE,
  MAX_VALID_LATENCY_MS,
  classifyRouteCategory,
  defaultCorrelationId,
  isValidLatencySample,
  readCorrelationHeader,
  resolveCorrelationId,
  toRouteCategoryBreakdown,
} from './telemetry-observation.rules';

/**
 * The same paths the O02 migration backfilled with a POSIX `path ~ ...`
 * expression. Both sides must agree, or historical rows and new rows would be
 * classified differently and the customer/health-check split would be wrong for
 * the retained history.
 */
const PATH_FIXTURES = [
  '/health',
  '/health/live',
  '/health/ready',
  '/health/db',
  '/health/metrics',
  '/health/system',
  '/api/health',
  '/api/health/ready',
  '/api/v1/health',
  '/api/v2/health/live',
  '/api/v1/internal/clinics',
  '/api/internal/billing/invoices',
  '/internal',
  '/api/v1/patients',
  '/api/v1/patients/abc-123',
  '/api/v1/billing/invoices/inv_1/payment',
  '/api/v1/public-booking/availability',
  '/api/v1/patients/health',
  '/api/v1/patients/healthz',
  '/healthz',
  '/api/v1/dashboard/analytics',
  '/api/v1/lab-portal/results',
  '/api/v1/whatsapp/webhook',
];

describe('classifyRouteCategory', () => {
  it.each(
    PATH_FIXTURES.filter((path) =>
      new RegExp(HEALTH_PATH_REGEX_SOURCE).test(path),
    ),
  )('treats %s as a health check', (path) => {
    expect(classifyRouteCategory(path)).toBe(RouteCategory.HEALTH_CHECK);
  });

  it.each(
    PATH_FIXTURES.filter(
      (path) => !new RegExp(HEALTH_PATH_REGEX_SOURCE).test(path),
    ),
  )('does not treat %s as a health check', (path) => {
    expect(classifyRouteCategory(path)).not.toBe(RouteCategory.HEALTH_CHECK);
  });

  it('separates internal staff traffic from customer operations', () => {
    expect(classifyRouteCategory('/api/v1/internal/clinics')).toBe(
      RouteCategory.INTERNAL,
    );
    expect(classifyRouteCategory('/api/v1/internal')).toBe(
      RouteCategory.INTERNAL,
    );
    expect(classifyRouteCategory('/api/v1/patients')).toBe(
      RouteCategory.CUSTOMER,
    );
  });

  it('anchors health matching to the path root', () => {
    // Only a health path is a probe. An internal route that merely ends in
    // /health is still staff operations, and an internal probe served from a
    // real /health path is a probe.
    expect(classifyRouteCategory('/api/v1/internal/health')).toBe(
      RouteCategory.INTERNAL,
    );
    expect(classifyRouteCategory('/api/health')).toBe(
      RouteCategory.HEALTH_CHECK,
    );
  });

  it('does not match lookalike paths', () => {
    expect(classifyRouteCategory('/api/v1/healthz')).toBe(
      RouteCategory.CUSTOMER,
    );
    expect(classifyRouteCategory('/api/v1/healthcare')).toBe(
      RouteCategory.CUSTOMER,
    );
    expect(classifyRouteCategory('/api/v1/internals')).toBe(
      RouteCategory.CUSTOMER,
    );
  });

  /**
   * Guards the hand-shared regex against drift in either direction. The
   * migration file is read rather than trusted, so editing one without the
   * other fails here.
   */
  it('uses the same health and internal expressions as the O02 migration backfill', () => {
    const migration = readFileSync(
      path.resolve(
        __dirname,
        '../../../../../../../../packages/db/prisma/migrations/20261003040000_telemetry_capture_and_route_identity/migration.sql',
      ),
      'utf8',
    );
    expect(migration).toContain(`'${HEALTH_PATH_REGEX_SOURCE}'`);
    expect(migration).toContain(`'${INTERNAL_PATH_REGEX_SOURCE}'`);
  });
});

describe('isValidLatencySample', () => {
  it('accepts ordinary request durations', () => {
    expect(isValidLatencySample(0)).toBe(true);
    expect(isValidLatencySample(1)).toBe(true);
    expect(isValidLatencySample(MAX_VALID_LATENCY_MS)).toBe(true);
  });

  it('rejects samples outside the believable range', () => {
    expect(isValidLatencySample(-1)).toBe(false);
    expect(isValidLatencySample(MAX_VALID_LATENCY_MS + 1)).toBe(false);
  });

  it('rejects non-finite samples', () => {
    expect(isValidLatencySample(Number.NaN)).toBe(false);
    expect(isValidLatencySample(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe('resolveCorrelationId', () => {
  it('reuses an inbound id that is already a safe token', () => {
    expect(resolveCorrelationId('abc12345')).toBe('abc12345');
    expect(resolveCorrelationId('req-01HXYZ-_')).toBe('req-01HXYZ-_');
  });

  it('uses the first value of a multi-valued header', () => {
    expect(resolveCorrelationId('first1aa, second2bb')).toBe('first1aa');
  });

  it('replaces values that are not safe tokens', () => {
    const generate = () => 'generated-id';
    // Too short, too long, wrong charset, and an injection attempt.
    expect(resolveCorrelationId('short', generate)).toBe('generated-id');
    expect(resolveCorrelationId('a'.repeat(65), generate)).toBe('generated-id');
    expect(resolveCorrelationId('has space here', generate)).toBe(
      'generated-id',
    );
    expect(resolveCorrelationId("'; DROP TABLE--", generate)).toBe(
      'generated-id',
    );
    expect(resolveCorrelationId(42, generate)).toBe('generated-id');
    expect(resolveCorrelationId(undefined, generate)).toBe('generated-id');
  });

  it('generates a distinct opaque id by default', () => {
    const first = resolveCorrelationId(undefined);
    const second = resolveCorrelationId(undefined);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).not.toBe(first);
    expect(defaultCorrelationId()).not.toBe(first);
  });
});

describe('readCorrelationHeader', () => {
  it('reads a string or array header bag', () => {
    expect(readCorrelationHeader({ 'x-request-id': 'abc12345' })).toBe(
      'abc12345',
    );
    expect(readCorrelationHeader({ 'x-request-id': ['first1aa'] })).toBe(
      'first1aa',
    );
  });

  it('returns undefined for missing or non-string values', () => {
    expect(readCorrelationHeader(undefined)).toBeUndefined();
    expect(readCorrelationHeader({})).toBeUndefined();
    expect(readCorrelationHeader({ 'x-request-id': 7 })).toBeUndefined();
    expect(readCorrelationHeader({ 'x-request-id': [7] })).toBeUndefined();
  });
});

describe('toRouteCategoryBreakdown', () => {
  it('maps grouped rows onto the shared contract', () => {
    expect(
      toRouteCategoryBreakdown([
        { routeCategory: RouteCategory.CUSTOMER, _count: { id: 5 } },
        { routeCategory: RouteCategory.HEALTH_CHECK, _count: { id: 40 } },
        { routeCategory: RouteCategory.INTERNAL, _count: { id: 1 } },
      ]),
    ).toEqual({ customer: 5, healthCheck: 40, internal: 1 });
  });

  it('returns zeroes for an empty result instead of undefined fields', () => {
    expect(toRouteCategoryBreakdown([])).toEqual({
      customer: 0,
      healthCheck: 0,
      internal: 0,
    });
  });
});
