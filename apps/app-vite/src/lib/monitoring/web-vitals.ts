import { captureMessage } from "./sentry.client.config";

type MetricName = "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";

interface MetricReport {
  name: MetricName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

/**
 * Report web vital metrics to Sentry as breadcrumbs and messages.
 * Call in main.tsx after initializeSentryClient().
 *
 * Uses the PerformanceObserver API (no external library needed).
 */
export function installWebVitalsReporter(): void {
  if (typeof window === "undefined" || !window.PerformanceObserver) return;

  // check-as-cast-density: allow-file — window flag + PerformanceObserver/LayoutShift entry typing gaps (platform API, no safe narrowing)
  const win = window as unknown as Record<string, unknown>;
  if (win.__vitalsReporterInstalled) return;
  win.__vitalsReporterInstalled = true;

  const reportMetric = (metric: MetricReport) => {
    captureMessage(`Web Vitals: ${metric.name}`, "info");

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
          rating: lastEntry.startTime < 2500 ? "good" : lastEntry.startTime < 4000 ? "needs-improvement" : "poor",
        });
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch { /* LCP not supported */ }

  // First Input Delay
  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        reportMetric({
          name: "FID",
          value: fidEntry.processingStart - fidEntry.startTime,
          rating: fidEntry.duration < 100 ? "good" : fidEntry.duration < 300 ? "needs-improvement" : "poor",
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
          rating: clsValue < 0.1 ? "good" : clsValue < 0.25 ? "needs-improvement" : "poor",
        });
      }
    });
  } catch { /* CLS not supported */ }

  // Time to First Byte
  try {
    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navEntry) {
      reportMetric({
        name: "TTFB",
        value: navEntry.responseStart - navEntry.requestStart,
        rating: navEntry.responseStart - navEntry.requestStart < 800 ? "good" : navEntry.responseStart - navEntry.requestStart < 1800 ? "needs-improvement" : "poor",
      });
    }
  } catch { /* TTFB not supported */ }

  // First Contentful Paint
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        reportMetric({
          name: "FCP",
          value: entry.startTime,
          rating: entry.startTime < 1800 ? "good" : entry.startTime < 3000 ? "needs-improvement" : "poor",
        });
        break;
      }
    });
    fcpObserver.observe({ type: "paint", buffered: true });
  } catch { /* FCP not supported */ }
}
