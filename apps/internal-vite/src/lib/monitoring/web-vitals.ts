// check-as-cast-density: allow-file — PerformanceObserver/LayoutShift entry typing gaps (platform API, no safe narrowing); the __vitalsReporterInstalled flag is typed in src/app-globals.d.ts
import { captureMessage } from "./sentry.client.config";
import { postWebVitalsRum, type WebVitalsRumPayload } from "./web-vitals-payload";

type MetricName = "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";
type MetricRating = "good" | "needs-improvement" | "poor";

// Client-side rating thresholds mirror WebVitalsMetricsService.getRating in the
// API, which is the canonical copy — keep the two in sync.
const RATINGS: Record<MetricName, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  FID: { good: 100, poor: 300 },
  TTFB: { good: 800, poor: 1800 },
};

function rateMetric(name: MetricName, value: number): MetricRating {
  const threshold = RATINGS[name];
  if (value <= threshold.good) return "good";
  if (value >= threshold.poor) return "poor";
  return "needs-improvement";
}

function getPagePath(): string | null {
  try {
    return window.location.pathname + window.location.search;
  } catch {
    return null;
  }
}

// In-memory session marker (P5.20): the dedupe only needs to survive the
// page lifetime, so a module-level singleton replaces the storage API
// round-trip — no storage API usage, nothing for check:client-storage-usage
// to allowlist. Per-tab, per-load grouping is preserved by the caller's
// `sessionId` field on each payload.
let rumSessionId: string | null = null;

function getSessionId(): string {
  if (rumSessionId) return rumSessionId;
  rumSessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return rumSessionId;
}

/**
 * Report web vitals to Sentry (breadcrumb) and the same-origin RUM endpoint
 * (`/api/v1/monitoring/web-vitals`, proxied by the Cloudflare Worker). The
 * data-access `postInternalWebVitals` helper posts against the API base URL,
 * which resolves through the same-origin proxy in production.
 */
export function installWebVitalsReporter(): void {
  if (typeof window === "undefined" || !window.PerformanceObserver) return;
  // __vitalsReporterInstalled flag is typed in src/app-globals.d.ts
  if (window.__vitalsReporterInstalled) return;
  window.__vitalsReporterInstalled = true;

  const page = getPagePath();
  const sessionId = getSessionId();

  const reportMetric = (name: MetricName, value: number) => {
    captureMessage(`Web Vitals: ${name}`, "info");
    const payload: WebVitalsRumPayload = {
      name,
      value,
      rating: rateMetric(name, value),
      page,
      feature: "internal-admin",
      sessionId,
    };
    postWebVitalsRum(payload);
  };

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) reportMetric("LCP", lastEntry.startTime);
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch { /* skip */ }

  // Interaction to Next Paint
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
  } catch { /* skip */ }

  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        reportMetric("FID", fidEntry.processingStart - fidEntry.startTime);
      }
    });
    fidObserver.observe({ type: "first-input", buffered: true });
  } catch { /* skip */ }

  // Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as unknown as { hadRecentInput: boolean; value: number };
        if (!shift.hadRecentInput) clsValue += shift.value;
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") reportMetric("CLS", clsValue);
    });
  } catch { /* skip */ }

  try {
    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navEntry) reportMetric("TTFB", navEntry.responseStart - navEntry.requestStart);
  } catch { /* skip */ }

  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        reportMetric("FCP", entry.startTime);
        break;
      }
    });
    fcpObserver.observe({ type: "paint", buffered: true });
  } catch { /* skip */ }
}
