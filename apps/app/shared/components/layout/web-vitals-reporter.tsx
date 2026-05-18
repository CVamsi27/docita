"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Metric } from "web-vitals";
import { browserRequest } from "@/lib/auth/browser-request";

export const WEB_VITALS_REPORTING_PATH = "/api/v1/monitoring/web-vitals";

const PUBLIC_AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/portal/login",
]);

export function shouldReportWebVitals(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return !PUBLIC_AUTH_PATHS.has(pathname);
}

export function createWebVitalsBeaconBody(payload: Record<string, unknown>) {
  return new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });
}

export function WebVitalsReporter() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!shouldReportWebVitals(pathname)) {
      return;
    }

    const sessionId = `session-${Date.now()}-${Math.random()}`;

    function sendToAnalytics(metric: Metric) {
      const payload = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        page: pathname,
        feature: "clinician-app",
        sessionId,
      };
      const body = JSON.stringify(payload);

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          WEB_VITALS_REPORTING_PATH,
          createWebVitalsBeaconBody(payload),
        );
      } else {
        void browserRequest(WEB_VITALS_REPORTING_PATH, {
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
