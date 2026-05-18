"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Metric } from "web-vitals";
import { API_URL } from "@/lib/api/api-config";

const PUBLIC_INTERNAL_PATHS = new Set(["/"]);

export function shouldReportInternalWebVitals(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return !PUBLIC_INTERNAL_PATHS.has(pathname);
}

function createWebVitalsBeaconBody(payload: Record<string, unknown>) {
  return new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });
}

export function InternalWebVitalsReporter() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!shouldReportInternalWebVitals(pathname)) {
      return;
    }

    const sessionId = `internal-session-${Date.now()}-${Math.random()}`;

    function sendToAnalytics(metric: Metric) {
      const payload = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        page: pathname,
        feature: "internal-admin",
        sessionId,
      };
      const body = JSON.stringify(payload);

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `${API_URL}/monitoring/web-vitals`,
          createWebVitalsBeaconBody(payload),
        );
      } else {
        void fetch(`${API_URL}/monitoring/web-vitals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    }

    void import("web-vitals").then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(sendToAnalytics);
      onINP(sendToAnalytics);
      onFCP(sendToAnalytics);
      onLCP(sendToAnalytics);
      onTTFB(sendToAnalytics);
    });
  }, [pathname]);

  return null;
}
