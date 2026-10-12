import { isRecord } from "@workspace/utils";

/**
 * Platform-level outage detection shared by the clinician app and the internal
 * console.
 *
 * The store answers one question: "is the API reachable right now?" Only
 * signals that mean the platform itself is down count — 502/503/504 responses
 * and network/timeout failures. Application errors (400/401/404/500) mean the
 * API answered, so they never flip the state. A suspicion is always confirmed
 * with a `/health/ready` probe (verify-before-alarm) so a single flaky request
 * cannot blank the workspace, and while the API is down the store keeps probing
 * with backoff until it comes back.
 *
 * Each app instantiates its own singleton with its own API base (see
 * `apps/<app>/src/lib/api/api-availability.ts`); this module holds the reusable
 * machinery.
 */

/** Status codes that mean the platform (not the request) is momentarily down. */
const UNAVAILABLE_STATUS_CODES = new Set([502, 503, 504]);

/**
 * Readiness probe target. The API registers its health controller
 * VERSION_NEUTRAL (`/api/health/*`), so the probe strips the `/v1` version
 * segment from the API base instead of appending to it. `/health/ready`
 * returns 503 exactly when Postgres is unreachable.
 */
const HEALTH_PROBE_SUFFIX = "/health/ready";
/** Above the API's own 5s database check so a DB outage reports as "database". */
const PROBE_TIMEOUT_MS = 8_000;
const MIN_RETRY_DELAY_MS = 2_000;
const MAX_RETRY_DELAY_MS = 10_000;
const RETRY_DELAY_INCREMENT_MS = 1_500;

export type ApiAvailabilityStatus = "available" | "unavailable";
export type ApiUnavailableReason = "api" | "database";

/** Timer ids differ between DOM (`number`) and Node typings; the bare globals cover both. */
type TimerId = ReturnType<typeof setTimeout>;

export interface ApiAvailabilitySnapshot {
  status: ApiAvailabilityStatus;
  /** Why the API is unreachable — only set while unavailable. */
  reason: ApiUnavailableReason | null;
  /** Consecutive failed probes since the outage started; 0 while available. */
  attempt: number;
  /** True while a readiness probe is in flight. */
  isProbing: boolean;
}

export type ApiProbeOutcome =
  | { reachable: true }
  | { reachable: false; reason: ApiUnavailableReason };

type ApiProber = () => Promise<ApiProbeOutcome>;

export interface ApiAvailabilityStore {
  getSnapshot: () => ApiAvailabilitySnapshot;
  subscribe: (listener: () => void) => () => void;
  /** Report a 502/503/504 response; verification runs in the background. */
  trackResponse: (response: Response) => void;
  /** Report an unreachable API (network/timeout); verification runs in the background. */
  reportUnavailable: () => void;
  /** Confirm the API is reachable (any successful response). */
  reportAvailable: () => void;
  /** Await the in-flight verification so callers can branch on the settled state. */
  confirmUnavailability: () => Promise<void>;
  /** Resolves once the API is reachable again. */
  waitForAvailable: () => Promise<void>;
  /**
   * Check availability right now: probes when the API is assumed reachable
   * (boot check) and skips the backoff delay while it is down.
   */
  retryNow: () => void;
}

const AVAILABLE_SNAPSHOT: ApiAvailabilitySnapshot = {
  status: "available",
  reason: null,
  attempt: 0,
  isProbing: false,
};

function isUnavailableStatus(status: number): boolean {
  return UNAVAILABLE_STATUS_CODES.has(status);
}

/** Content types that mean an intermediary answered, not the API. */
const NON_API_ERROR_CONTENT_TYPES = ["text/html", "text/plain"];

/**
 * Whether a response means the platform is down rather than "the API answered
 * with an error". Gateway statuses always qualify; any other 5xx only counts
 * when an intermediary produced it — Cloudflare answers an unreachable upstream
 * with an HTML 500 error page, and the Vite dev proxy answers 502 text/plain,
 * while the API itself always replies with a JSON error body. An application
 * 500 (JSON, or empty) therefore never flips the state.
 */
function isUnavailableResponse(response: Response): boolean {
  if (isUnavailableStatus(response.status)) return true;
  if (response.status < 500) return false;
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  return NON_API_ERROR_CONTENT_TYPES.some((type) => contentType.includes(type));
}

function retryDelayMs(attempt: number): number {
  return Math.min(
    MIN_RETRY_DELAY_MS + (attempt - 1) * RETRY_DELAY_INCREMENT_MS,
    MAX_RETRY_DELAY_MS,
  );
}

function sameSnapshot(
  a: ApiAvailabilitySnapshot,
  b: ApiAvailabilitySnapshot,
): boolean {
  return (
    a.status === b.status &&
    a.reason === b.reason &&
    a.attempt === b.attempt &&
    a.isProbing === b.isProbing
  );
}

export function createApiAvailabilityStore(probe: ApiProber): ApiAvailabilityStore {
  let snapshot: ApiAvailabilitySnapshot = AVAILABLE_SNAPSHOT;
  const listeners = new Set<() => void>();
  let verificationPromise: Promise<void> | null = null;
  let recoveryPromise: Promise<void> | null = null;
  let retryTimer: TimerId | null = null;
  let wakeRetryDelay: (() => void) | null = null;

  function setSnapshot(next: ApiAvailabilitySnapshot): void {
    if (sameSnapshot(snapshot, next)) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  async function runProbe(): Promise<ApiProbeOutcome> {
    try {
      return await probe();
    } catch {
      return { reachable: false, reason: "api" };
    }
  }

  function waitForRetryDelay(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      const finish = () => {
        if (retryTimer !== null) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        wakeRetryDelay = null;
        resolve();
      };
      wakeRetryDelay = finish;
      retryTimer = setTimeout(finish, delayMs);
    });
  }

  async function recover(): Promise<void> {
    let attempt = snapshot.attempt;
    while (snapshot.status === "unavailable") {
      attempt += 1;
      setSnapshot({ ...snapshot, attempt, isProbing: true });
      const outcome = await runProbe();
      if (outcome.reachable) {
        setSnapshot(AVAILABLE_SNAPSHOT);
        return;
      }
      setSnapshot({
        status: "unavailable",
        reason: outcome.reason,
        attempt,
        isProbing: false,
      });
      await waitForRetryDelay(retryDelayMs(attempt));
    }
  }

  function startRecovery(): void {
    recoveryPromise ??= recover().finally(() => {
      recoveryPromise = null;
    });
  }

  async function verify(): Promise<void> {
    setSnapshot({ ...snapshot, isProbing: true });
    const outcome = await runProbe();
    if (outcome.reachable) {
      setSnapshot(AVAILABLE_SNAPSHOT);
      return;
    }
    setSnapshot({
      status: "unavailable",
      reason: outcome.reason,
      attempt: 0,
      isProbing: false,
    });
    startRecovery();
  }

  function confirmUnavailability(): Promise<void> {
    if (snapshot.status === "unavailable") return Promise.resolve();
    verificationPromise ??= verify().finally(() => {
      verificationPromise = null;
    });
    return verificationPromise;
  }

  function reportAvailable(): void {
    const wasUnavailable = snapshot.status === "unavailable";
    setSnapshot(AVAILABLE_SNAPSHOT);
    if (wasUnavailable) wakeRetryDelay?.();
  }

  function reportUnavailable(): void {
    if (snapshot.status === "unavailable") return;
    void confirmUnavailability();
  }

  function trackResponse(response: Response): void {
    if (isUnavailableResponse(response)) {
      reportUnavailable();
      return;
    }
    if (response.ok) reportAvailable();
  }

  function waitForAvailable(): Promise<void> {
    if (snapshot.status === "available") return Promise.resolve();
    return new Promise((resolve) => {
      const unsubscribe = subscribe(() => {
        if (snapshot.status === "available") {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  function retryNow(): void {
    if (snapshot.status === "available") {
      void confirmUnavailability();
      return;
    }
    wakeRetryDelay?.();
  }

  return {
    getSnapshot: () => snapshot,
    subscribe,
    trackResponse,
    reportUnavailable,
    reportAvailable,
    confirmUnavailability,
    waitForAvailable,
    retryNow,
  };
}

/** Resolve the readiness probe URL from the versioned API base. */
export function buildApiHealthProbeUrl(apiBaseUrl: string): string {
  const versionless = apiBaseUrl.replace(/\/+$/, "").replace(/\/v\d+$/, "");
  // The health controller is version-neutral, so only the version segment goes
  // away. A base configured without the platform prefix (a build pointed at the
  // upstream host, e.g. `VITE_API_URL=http://localhost:3001`) still needs it.
  const base = /\/api(\/|$)/.test(versionless)
    ? versionless
    : `${versionless}/api`;
  return `${base}${HEALTH_PROBE_SUFFIX}`;
}

async function readUnavailableReason(
  response: Response,
): Promise<ApiUnavailableReason> {
  if (response.status !== 503) return "api";
  try {
    const body: unknown = await response.json();
    const checks = isRecord(body) ? body["checks"] : undefined;
    const database = isRecord(checks) ? checks["database"] : undefined;
    if (isRecord(database) && database["status"] === "disconnected") {
      return "database";
    }
  } catch {
    // Non-JSON body: fall through to the generic API reason.
  }
  return "api";
}

/**
 * Build the readiness prober for an app's API base. Only platform-level
 * failures count as unreachable; every other response (including 4xx and JSON
 * 5xx error envelopes) proves the API is answering.
 */
export function createReadinessProber(
  getApiBaseUrl: () => string,
): ApiProber {
  return async (): Promise<ApiProbeOutcome> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    try {
      const response = await fetch(buildApiHealthProbeUrl(getApiBaseUrl()), {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
      });

      if (response.ok) return { reachable: true };
      // Anything else that is not a gateway/CDN failure proves the API is
      // reachable (including 4xx and JSON 5xx error envelopes).
      if (!isUnavailableResponse(response)) return { reachable: true };
      return { reachable: false, reason: await readUnavailableReason(response) };
    } catch {
      return { reachable: false, reason: "api" };
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Whether a failed API call means the platform is down. Only 502/503/504
 * responses and network/timeout failures qualify; every other status proves the
 * API answered, so a domain error (400/401/404/500) never blanks the workspace.
 */
export function isPlatformOutageError(error: unknown): boolean {
  if (!isRecord(error)) return false;

  const status = error["status"];
  if (typeof status === "number" && isUnavailableStatus(status)) return true;

  if (error["isNetworkError"] === true || error["isTimeout"] === true) return true;

  const code = error["code"];
  return code === "NETWORK_ERROR" || code === "TIMEOUT";
}

/** Bounded retries when the API answers but validation keeps failing. */
const MAX_TRANSIENT_RETRIES = 2;
/** Bounded outage -> recovery cycles per bootstrap; each waits for real recovery. */
const MAX_OUTAGE_RECOVERIES = 6;

export interface OutageRecoveryState {
  transientRetries: number;
  outageRecoveries: number;
}

export function createOutageRecoveryState(): OutageRecoveryState {
  return { transientRetries: 0, outageRecoveries: 0 };
}

/**
 * Park an auth bootstrap on the outage gate until the API answers again,
 * instead of dropping a session the refresh cookie still backs. Returns false
 * when retries are exhausted and the bootstrap should settle.
 */
export async function recoverFromApiOutage(
  store: ApiAvailabilityStore,
  recovery: OutageRecoveryState,
): Promise<boolean> {
  store.reportUnavailable();
  await store.confirmUnavailability();

  if (store.getSnapshot().status === "available") {
    // The probe answered, so the failure was a one-off request failure rather
    // than an outage; retry a bounded number of times.
    if (recovery.transientRetries >= MAX_TRANSIENT_RETRIES) return false;
    recovery.transientRetries += 1;
    return true;
  }

  if (recovery.outageRecoveries >= MAX_OUTAGE_RECOVERIES) return false;
  recovery.outageRecoveries += 1;
  await store.waitForAvailable();
  return true;
}
