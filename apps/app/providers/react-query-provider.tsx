"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { ApiError } from "@/lib/errors";

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
            // Default: Cache data for 10 seconds before considering it stale
            // Use query-specific staleTime for different data types:
            // - Dashboard/Analytics: 30s (frequently updated, UI-critical)
            // - Patient Lists: 60s (moderate change frequency)
            // - Appointment Slots: 15s (highly dynamic)
            // - Static Data (settings, doctors): 5min (rarely changes)
            staleTime: 10 * 1000,

            // Keep unused data in cache for 5 minutes
            // This prevents refetches if user navigates back within 5 min
            gcTime: 5 * 60 * 1000,

            // Refetch on window focus to keep dashboard updated
            // For critical data like appointment queue, this ensures real-time sync
            refetchOnWindowFocus: true,

            // Refetch on mount if data is stale
            // This is especially important for time-sensitive data
            refetchOnMount: true,

            // Retry failed requests with exponential backoff
            retry: (failureCount, error) => {
              if (error instanceof ApiError) {
                // Don't retry on 4xx errors (client errors)
                if (error.statusCode >= 400 && error.statusCode < 500) {
                  return false;
                }
              }
              // Retry up to 2 times for other errors (network or 5xx)
              return failureCount < 2;
            },

            // Exponential backoff delay: 1s, 2s, 4s, 8s, 16s, 30s (max)
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),

            // Enable background refetching when stale
            // This keeps data fresh without blocking the UI
            staleTime: 10 * 1000,
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
