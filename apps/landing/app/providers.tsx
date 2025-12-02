"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";

// ✅ OPTIMIZATION: Web Vitals monitoring for performance tracking
async function reportWebVitals(): Promise<void> {
  // Collect Core Web Vitals metrics using PerformanceObserver
  try {
    const vitals: Record<string, number | undefined> = {};

    // Measure CLS (Cumulative Layout Shift)
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };
        if (!layoutShiftEntry.hadRecentInput) {
          vitals.cls = (vitals.cls || 0) + (layoutShiftEntry.value || 0);
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });

    // Measure LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((list) => {
      vitals.lcp = list.getEntries().pop()?.startTime;
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

    // Measure FCP (First Contentful Paint)
    const fcpObserver = new PerformanceObserver((list) => {
      vitals.fcp = list.getEntries()[0]?.startTime;
    });
    fcpObserver.observe({ type: "paint", buffered: true });

    // Measure TTFB (Time to First Byte)
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceEntry & { responseStart?: number };
    if (navigation) {
      vitals.ttfb = navigation.responseStart;
    }

    // Send vitals to analytics endpoint if available
    setTimeout(() => {
      if (
        process.env.NEXT_PUBLIC_ANALYTICS_URL &&
        Object.keys(vitals).length > 0
      ) {
        navigator.sendBeacon(
          `${process.env.NEXT_PUBLIC_ANALYTICS_URL}/vitals`,
          JSON.stringify(vitals),
        );
      }
    }, 5000); // Send after 5 seconds to allow all metrics to be collected
  } catch {
    // Gracefully handle if PerformanceObserver is not available
    console.warn("Web Vitals monitoring not available");
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1, // Reduce retry attempts to prevent cascading failures
          },
        },
      }),
  );

  useEffect(() => {
    // Initialize Web Vitals reporting on mount
    reportWebVitals();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
