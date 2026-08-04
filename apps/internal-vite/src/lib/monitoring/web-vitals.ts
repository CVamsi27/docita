// check-as-cast-density: allow-file — window global flag + PerformanceObserver entry typing gaps (platform API, no safe narrowing)
import { captureMessage } from "./sentry.client.config";

export function installWebVitalsReporter(): void {
  if (typeof window === "undefined" || !window.PerformanceObserver) return;
  const win = window as unknown as Record<string, unknown>;
  if (win.__vitalsReporterInstalled) return;
  win.__vitalsReporterInstalled = true;

  const reportMetric = (name: string, _value: number) => {
    captureMessage(`Web Vitals: ${name}`, "info");
  };

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) reportMetric("LCP", lastEntry.startTime);
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch { /* skip */ }

  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        reportMetric("FID", (entry as PerformanceEventTiming).processingStart - entry.startTime);
      }
    });
    fidObserver.observe({ type: "first-input", buffered: true });
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
