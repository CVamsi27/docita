import { buildURL } from "../../lib/request-helpers";

export type InternalWebVitalsPayload = {
  name: string;
  value: number;
  rating: string;
  page: string | null;
  feature: string;
  sessionId: string;
};

function createWebVitalsBeaconBody(payload: InternalWebVitalsPayload): Blob {
  return new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });
}

/** Posts web-vitals metrics (beacon preferred; fetch keepalive fallback). */
export function postInternalWebVitals(
  baseURL: string,
  payload: InternalWebVitalsPayload,
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
