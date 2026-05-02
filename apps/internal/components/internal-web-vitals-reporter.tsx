"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Metric } from "web-vitals";
import { API_URL } from "@/lib/api-config";

export function InternalWebVitalsReporter() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    const sessionId = `internal-session-${Date.now()}-${Math.random()}`;

    function sendToAnalytics(metric: Metric) {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        page: pathname,
        feature: "internal-admin",
        sessionId,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${API_URL}/monitoring/web-vitals`, body);
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
