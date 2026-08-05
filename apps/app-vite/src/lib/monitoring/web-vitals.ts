import { captureMessage } from "./sentry.client.config";
import { postWebVitalsRum, type WebVitalsRumPayload } from "./web-vitals-payload";

type MetricName = "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";
type MetricRating = "good" | "needs-improvement" | "poor";

interface MetricReport {
  name: MetricName;
  value: number;
  rating: MetricRating;
}

const APP_FEATURE = "clinician-app";

// Client-side rating thresholds mirror WebVitalsMetricsService.getRating in the
// API (packages/types/src/admin/monitoring.ts WebVitalSchema + the API service),
// which is the canonical copy — keep the two in sync.
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

function getSessionId(): string {
  try {
    let sessionId = window.sessionStorage.getItem("rum_session_id");
    if (!sessionId) {
      sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem("rum_session_id", sessionId);
    }
    return sessionId;
  } catch {
    return "";
  }
}

/**
 * Report web vitals to Sentry (breadcrumb) and to the same-origin RUM endpoint
 * (`/api/v1/monitoring/web-vitals`, proxied by the Cloudflare Worker / Vite dev
 * proxy). Call in main.tsx after initializeSentryClient().
 *
 * Uses the PerformanceObserver API (no external library needed). RUM failures
 * are silent by design — telemetry must never affect the clinical flow.
 */
export function installWebVitalsReporter(): void {
  if (typeof window === "undefined" || !window.PerformanceObserver) return;

  // check-as-cast-density: allow-file — window flag + PerformanceObserver/LayoutShift entry typing gaps (platform API, no safe narrowing)
  const win = window as unknown as Record<string, unknown>;
  if (win.__vitalsReporterInstalled) return;
  win.__vitalsReporterInstalled = true;

  const page = getPagePath();
  const sessionId = getSessionId();

  const reportMetric = (metric: MetricReport) => {
    captureMessage(`Web Vitals: ${metric.name}`, "info");

    const payload: WebVitalsRumPayload = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      page,
      feature: APP_FEATURE,
      sessionId,
    };
    postWebVitalsRum(payload);

    // Also store in performance entries for debugging
    if (performance.measure) {
      try {
        performance.measure(`vit_${metric.name}`, {
          detail: metric,
        });
      } catch {
        // Measuring is best-effort
      }
    }
  };

  // Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        reportMetric({
          name: "LCP",
          value: lastEntry.startTime,
          rating: rateMetric("LCP", lastEntry.startTime),
        });
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch { /* LCP not supported */ }

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
        reportMetric({ name: "INP", value: lastInp, rating: rateMetric("INP", lastInp) });
      }
    });
  } catch { /* INP not supported */ }

  // First Input Delay (legacy; kept for browsers without event timing)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        reportMetric({
          name: "FID",
          value: fidEntry.processingStart - fidEntry.startTime,
          rating: rateMetric("FID", fidEntry.processingStart - fidEntry.startTime),
        });
      }
    });
    fidObserver.observe({ type: "first-input", buffered: true });
  } catch { /* FID not supported */ }

  // Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as unknown as { hadRecentInput: boolean; value: number };
        if (!shift.hadRecentInput) {
          clsValue += shift.value;
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });

    // Report CLS on page unload
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        reportMetric({
          name: "CLS",
          value: clsValue,
          rating: rateMetric("CLS", clsValue),
        });
      }
    });
  } catch { /* CLS not supported */ }

  // Time to First Byte
  try {
    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navEntry) {
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      reportMetric({ name: "TTFB", value: ttfb, rating: rateMetric("TTFB", ttfb) });
    }
  } catch { /* TTFB not supported */ }

  // First Contentful Paint
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        reportMetric({ name: "FCP", value: entry.startTime, rating: rateMetric("FCP", entry.startTime) });
        break;
      }
    });
    fcpObserver.observe({ type: "paint", buffered: true });
  } catch { /* FCP not supported */ }
}
