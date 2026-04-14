"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { ApiError } from "@/lib/errors";
import { QUERY_GC_TIMES } from "@/lib/react-query-config";

async function reportWebVitals() {
  interface WebVitals {
    cls?: number;
    lcp?: number;
    fcp?: number;
    ttfb?: number;
  }
  try {
    if (!process.env["NEXT_PUBLIC_ANALYTICS_URL"]) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (typeof PerformanceObserver === "undefined") {
      return;
    }

    const vitals: WebVitals = {};

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

    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        vitals.lcp = entries[entries.length - 1].startTime;
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        vitals.fcp = entries[0].startTime;
      }
    });
    fcpObserver.observe({ type: "paint", buffered: true });

    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navigation) {
      vitals.ttfb = navigation.responseStart;
    }

    const timeoutId = window.setTimeout(() => {
      try {
        if (Object.keys(vitals).length > 0) {
          navigator.sendBeacon(
            `${process.env["NEXT_PUBLIC_ANALYTICS_URL"]}/vitals`,
            JSON.stringify(vitals),
          );
        }
      } finally {
        clsObserver.disconnect();
        lcpObserver.disconnect();
        fcpObserver.disconnect();
      }
    }, 5000);
    void timeoutId;
  } catch {
    // best-effort only
  }
}

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            gcTime: QUERY_GC_TIMES.DEFAULT,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            retry: (failureCount: number, error: unknown) => {
              if (error instanceof ApiError) {
                if (error.statusCode >= 400 && error.statusCode < 500) {
                  return false;
                }
              }
              return failureCount < 2;
            },
            retryDelay: (attemptIndex: number) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    reportWebVitals();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
