"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";

// ✅ OPTIMIZATION: Web Vitals monitoring for performance tracking
async function reportWebVitals() {
  // Collect Core Web Vitals metrics using PerformanceObserver
  interface WebVitals {
    cls?: number;
    lcp?: number;
    fcp?: number;
    ttfb?: number;
  }
  try {
    const vitals: WebVitals = {};

    // Measure CLS (Cumulative Layout Shift)
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutEntry = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };
        if (!layoutEntry.hadRecentInput) {
          vitals.cls = (vitals.cls || 0) + (layoutEntry.value || 0);
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
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navigation) {
      vitals.ttfb = navigation.responseStart;
    }

    // Send vitals to analytics endpoint if available
    setTimeout(() => {
      if (
        process.env["NEXT_PUBLIC_ANALYTICS_URL"] &&
        Object.keys(vitals).length > 0
      ) {
        navigator.sendBeacon(
          `${process.env["NEXT_PUBLIC_ANALYTICS_URL"]}/vitals`,
          JSON.stringify(vitals),
        );
      }
    }, 5000); // Send after 5 seconds to allow all metrics to be collected
  } catch {
    // Gracefully handle if PerformanceObserver is not available
    console.warn("Web Vitals monitoring not available");
  }
}

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes before considering it stale
            staleTime: 5 * 60 * 1000,

            // Keep unused data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,

            // Don't refetch on window focus for better performance
            refetchOnWindowFocus: false,

            // Don't refetch on mount if data is fresh
            refetchOnMount: false,

            // Retry failed requests with exponential backoff
            retry: (failureCount, error: unknown) => {
              // Don't retry on 4xx errors (client errors)
              const httpError = error as
                | { response?: { status?: number } }
                | undefined;
              const status = httpError?.response?.status;
              if (typeof status === "number" && status >= 400 && status < 500) {
                return false;
              }
              // Retry up to 2 times for other errors
              return failureCount < 2;
            },

            // Exponential backoff delay
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // Retry mutations once on network errors
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    // Initialize Web Vitals reporting on mount
    reportWebVitals();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
