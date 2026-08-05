// check-as-cast-density: allow-file — PerformanceObserver/LayoutShift entry typing gaps (platform API, no safe narrowing; ES2021 DOM lib lacks durationThreshold + LayoutShift)
import { buildURL } from "../request-helpers";

/**
 * Web Vitals RUM payload for the anonymous `POST /api/v1/monitoring/web-vitals`
 * surface (MonitoringRumController). The API-side contract is `WebVitalSchema`
 * in `packages/types`; this is the focused client subset (AGENTS.md §3.2).
 *
 * Both apps post through their same-origin `/api` proxy (Cloudflare Worker /
 * dev proxy), so telemetry never leaves the app origin (AGENTS.md §4).
 */
export type WebVitalsRumPayload = {
  name: WebVitalsMetricName;
  value: number;
  rating: WebVitalsMetricRating;
  page: string | null;
  feature: string;
  sessionId: string;
};

export type WebVitalsMetricName =
  | "CLS"
  | "FCP"
  | "FID"
  | "INP"
  | "LCP"
  | "TTFB";

export type WebVitalsMetricRating = "good" | "needs-improvement" | "poor";

// Client-side rating thresholds mirror WebVitalsMetricsService.getRating in the
// API, which is the canonical copy — keep the two in sync.
const RATINGS: Record<WebVitalsMetricName, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  FID: { good: 100, poor: 300 },
  TTFB: { good: 800, poor: 1800 },
};

function rateMetric(
  name: WebVitalsMetricName,
  value: number,
): WebVitalsMetricRating {
  const threshold = RATINGS[name];
  if (value <= threshold.good) return "good";
  if (value >= threshold.poor) return "poor";
  return "needs-improvement";
}

function createWebVitalsBeaconBody(payload: WebVitalsRumPayload): Blob {
  return new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });
}

/**
 * Post a web-vitals metric to the RUM endpoint (beacon preferred; `fetch`
 * keepalive fallback). Failures are silent — RUM is best-effort telemetry and
 * must never surface to the clinician.
 */
export function postWebVitalsRum(
  baseURL: string,
  payload: WebVitalsRumPayload,
): void {
  const url = buildURL(baseURL, "monitoring/web-vitals");

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(url, createWebVitalsBeaconBody(payload));
    return;
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

// In-memory session marker (P5.20): the dedupe only needs to survive the page
// lifetime, so a module-level singleton replaces the storage API round-trip.
// Per-tab, per-load grouping is preserved by the payload's sessionId field.
let rumSessionId: string | null = null;

function getSessionId(): string {
  if (rumSessionId) return rumSessionId;
  rumSessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return rumSessionId;
}

function getPagePath(): string | null {
  try {
    return window.location.pathname + window.location.search;
  } catch {
    return null;
  }
}

// Module-level guard so a re-install (e.g. HMR) does not stack observers.
let reporterInstalled = false;

export type WebVitalsReporterOptions = {
  /** API base URL (same-origin proxy in production), used for the RUM post. */
  baseURL: string;
  /** RUM source discriminator, e.g. "clinician-app" vs "internal-admin". */
  feature: string;
  /** Optional per-metric hook (e.g. a Sentry breadcrumb). */
  onMetric?: (name: WebVitalsMetricName) => void;
};

/**
 * Install the browser web-vitals RUM reporter (LCP/INP/FID/CLS/TTFB/FCP via
 * PerformanceObserver). Call once at app bootstrap. No-op outside a browser
 * or when PerformanceObserver is unavailable; RUM failures are silent by
 * design — telemetry must never affect the clinical flow.
 */
export function installWebVitalsReporter(
  options: WebVitalsReporterOptions,
): void {
  if (typeof window === "undefined" || !window.PerformanceObserver) return;
  if (reporterInstalled) return;
  reporterInstalled = true;

  const page = getPagePath();
  const sessionId = getSessionId();

  const reportMetric = (name: WebVitalsMetricName, value: number) => {
    options.onMetric?.(name);
    postWebVitalsRum(options.baseURL, {
      name,
      value,
      rating: rateMetric(name, value),
      page,
      feature: options.feature,
      sessionId,
    });
  };

  // Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) reportMetric("LCP", lastEntry.startTime);
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    /* LCP not supported */
  }

  // Interaction to Next Paint (successor to FID; measured from event timing)
  try {
    let lastInp = 0;
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEventTiming;
        if (eventEntry.interactionId > 0) {
          lastInp = eventEntry.processingStart - eventEntry.startTime;
        }
      }
    });
    // durationThreshold is absent from the ES2021 DOM lib types; the value is
    // the spec-recommended interaction window for INP (16ms) and is supported
    // by all modern engines.
    inpObserver.observe({
      type: "event",
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && lastInp > 0) {
        reportMetric("INP", lastInp);
      }
    });
  } catch {
    /* INP not supported */
  }

  // First Input Delay (legacy; kept for browsers without event timing)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        reportMetric("FID", fidEntry.processingStart - fidEntry.startTime);
      }
    });
    fidObserver.observe({ type: "first-input", buffered: true });
  } catch {
    /* FID not supported */
  }

  // Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as unknown as {
          hadRecentInput: boolean;
          value: number;
        };
        if (!shift.hadRecentInput) clsValue += shift.value;
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });

    // Report CLS on page unload
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        reportMetric("CLS", clsValue);
      }
    });
  } catch {
    /* CLS not supported */
  }

  // Time to First Byte
  try {
    const navEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navEntry) {
      reportMetric("TTFB", navEntry.responseStart - navEntry.requestStart);
    }
  } catch {
    /* TTFB not supported */
  }

  // First Contentful Paint
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        reportMetric("FCP", entry.startTime);
        break;
      }
    });
    fcpObserver.observe({ type: "paint", buffered: true });
  } catch {
    /* FCP not supported */
  }
}
