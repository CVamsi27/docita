"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Metric } from "web-vitals";

/**
 * Web Vitals Reporter - Track Core Web Vitals and send to backend
 * ✅ OPTIMIZATION: Real User Monitoring (RUM) for performance tracking
 *
 * Metrics tracked:
 * - LCP (Largest Contentful Paint): Loading performance
 * - INP (Interaction to Next Paint): Interactivity (replaced FID)
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FCP (First Contentful Paint): First paint
 * - TTFB (Time to First Byte): Server response time
 *
 * Usage: Add <WebVitalsReporter /> to root layout
 */
export function WebVitalsReporter() {
  const pathname = usePathname();

  useEffect(() => {
    const sessionId = `session-${Date.now()}-${Math.random()}`;

    function sendToAnalytics(metric: Metric) {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        page: pathname,
        sessionId,
      });

      // Use sendBeacon for reliability (works even during page unload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/monitoring/web-vitals", body);
      } else {
        // Fallback to fetch
        fetch("/api/monitoring/web-vitals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch((err) => {
          console.error("Failed to send web vital:", err);
        });
      }
    }

    // Dynamically import web-vitals to avoid SSR issues
    import("web-vitals").then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(sendToAnalytics);
      onINP(sendToAnalytics);
      onFCP(sendToAnalytics);
      onLCP(sendToAnalytics);
      onTTFB(sendToAnalytics);
    });
  }, [pathname]);

  return null; // This component doesn't render anything
}
