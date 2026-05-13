"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Metric } from "web-vitals";
import { API_URL } from "@/lib/api-config";

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
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        page: pathname,
        feature: "clinician-app",
        sessionId,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${API_URL}/monitoring/web-vitals`, body);
      } else {
        fetch(`${API_URL}/monitoring/web-vitals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    }

    import("web-vitals").then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(sendToAnalytics);
      onINP(sendToAnalytics);
      onFCP(sendToAnalytics);
      onLCP(sendToAnalytics);
      onTTFB(sendToAnalytics);
    });
  }, [pathname]);

  return null;
}
