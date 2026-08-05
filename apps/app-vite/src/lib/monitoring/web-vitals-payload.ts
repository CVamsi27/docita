import { apiPath } from "@/lib/api/api-url-resolver";

/**
 * Web Vitals RUM payload for the anonymous `POST /api/v1/monitoring/web-vitals`
 * surface (MonitoringRumController). The API is behind the same-origin `/api`
 * proxy, so telemetry never leaves the app origin (AGENTS.md §4).
 *
 * `feature` discriminates RUM sources (clinician-app vs internal-admin) so the
 * internal monitoring UI can filter by app.
 */
export type WebVitalsRumPayload = {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  page: string | null;
  feature: string;
  sessionId: string;
};

function createWebVitalsBeaconBody(payload: WebVitalsRumPayload): Blob {
  return new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });
}

/**
 * Post a web-vitals metric to the same-origin RUM endpoint.
 * Beacon preferred; `fetch` keepalive fallback. Failures are silent — RUM is
 * best-effort and must never surface to the clinician.
 */
export function postWebVitalsRum(payload: WebVitalsRumPayload): void {
  const url = apiPath("/monitoring/web-vitals");

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
