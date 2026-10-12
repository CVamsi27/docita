/**
 * Pure classification rules for request telemetry (O02).
 *
 * Three questions a telemetry row has to answer honestly, and which the previous
 * pipeline could not answer at all:
 *
 * 1. Was this a clinician request or a synthetic probe? Liveness and readiness
 *    probes go through the same global interceptor as real traffic, so counting
 *    them as customer operations inflates volume and collapses the latency
 *    distribution toward the probe's own ~1ms.
 * 2. Did this row land in the window the request belongs to? Buffered rows are
 *    written up to 5s late, and after a persistence fault arbitrarily late.
 * 3. Is this latency sample usable? A duration produced by clock skew or a
 *    stalled event loop is real data but not a latency measurement.
 *
 * No NestJS, no I/O — these rules are unit-tested directly.
 */

import { RouteCategory } from '@workspace/db';
import type { RouteCategoryBreakdown } from '@workspace/types';
import { isRecord } from '@workspace/utils';

/**
 * POSIX-regex source shared with the O02 migration backfill. Postgres and
 * JavaScript agree on this subset, so the same expression in the migration's
 * `path ~ ...` UPDATE and in this module classify historical rows and new rows
 * identically. `telemetry-observation.rules.spec.ts` asserts the two agree
 * across a fixture list; change one, change both.
 */
export const HEALTH_PATH_REGEX_SOURCE = '^/(api/)?v?[0-9]*/?health(/|$)';

/**
 * Internal staff/partner surfaces. Operated by Docita, not by clinics, so they
 * are not "customer operations" even though a human triggers them.
 */
export const INTERNAL_PATH_REGEX_SOURCE = '^/(api/)?v?[0-9]*/?internal(/|$)';

/**
 * Upper bound for a believable latency sample. Above this the sample is more
 * likely a suspended host, a clock adjustment or a multi-hour event-loop stall
 * than a real request. Kept identical to the O02 migration backfill.
 */
export const MAX_VALID_LATENCY_MS = 120_000;

/** Health paths are unversioned in practice; keep the optional group anyway. */
const HEALTH_PATH_PATTERN = new RegExp(HEALTH_PATH_REGEX_SOURCE);
const INTERNAL_PATH_PATTERN = new RegExp(INTERNAL_PATH_REGEX_SOURCE);

/**
 * Inbound correlation header. Clients may send their own id so a trace spans
 * the edge, but the value is untrusted: it lands in a searchable column.
 */
const CORRELATION_HEADER = 'x-request-id';
const SAFE_CORRELATION_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Classifies a request path. Order matters: health wins over internal because
 * an internal health probe is still a probe.
 */
export function classifyRouteCategory(path: string): RouteCategory {
  if (HEALTH_PATH_PATTERN.test(path)) {
    return RouteCategory.HEALTH_CHECK;
  }
  if (INTERNAL_PATH_PATTERN.test(path)) {
    return RouteCategory.INTERNAL;
  }
  return RouteCategory.CUSTOMER;
}

/**
 * A latency sample is valid when it is a non-negative finite number within the
 * believable ceiling. Anything else is retained for inspection but must be
 * excluded from averages, percentiles and distribution buckets.
 */
export function isValidLatencySample(durationMs: number): boolean {
  return (
    Number.isFinite(durationMs) &&
    durationMs >= 0 &&
    durationMs <= MAX_VALID_LATENCY_MS
  );
}

/**
 * Resolves the correlation id for one request.
 *
 * Reuses a client-supplied id only when it is already an opaque safe token;
 * anything else is replaced with a generated UUID so an attacker cannot write
 * chosen values into a telemetry column or inflate its length.
 */
export function resolveCorrelationId(
  inboundValue: unknown,
  generate: () => string = defaultCorrelationId,
): string {
  if (typeof inboundValue === 'string') {
    const first = inboundValue.split(',')[0]?.trim();
    if (first && SAFE_CORRELATION_PATTERN.test(first)) {
      return first;
    }
  }
  return generate();
}

export function defaultCorrelationId(): string {
  return globalThis.crypto.randomUUID();
}

/** Reads the correlation header from an Express-style header bag. */
export function readCorrelationHeader(headers: unknown): string | undefined {
  const raw = isRecord(headers) ? headers[CORRELATION_HEADER] : undefined;
  if (Array.isArray(raw)) {
    return typeof raw[0] === 'string' ? raw[0] : undefined;
  }
  return typeof raw === 'string' ? raw : undefined;
}

/**
 * Maps a Prisma `groupBy(['routeCategory'])` result onto the shared breakdown
 * contract. Unknown categories are impossible today (the enum is closed); they
 * are counted as customer traffic rather than silently dropped.
 */
export function toRouteCategoryBreakdown(
  rows: ReadonlyArray<{ routeCategory: RouteCategory; _count: { id: number } }>,
): RouteCategoryBreakdown {
  const breakdown: RouteCategoryBreakdown = {
    customer: 0,
    healthCheck: 0,
    internal: 0,
  };
  for (const row of rows) {
    if (row.routeCategory === RouteCategory.HEALTH_CHECK) {
      breakdown.healthCheck = row._count.id;
    } else if (row.routeCategory === RouteCategory.INTERNAL) {
      breakdown.internal = row._count.id;
    } else {
      breakdown.customer = row._count.id;
    }
  }
  return breakdown;
}
