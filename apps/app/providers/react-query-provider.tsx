"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { ApiError } from "@/lib/errors";

async function reportWebVitals() {
  interface WebVitals {
    cls?: number;
    lcp?: number;
    fcp?: number;
    ttfb?: number;
  }
  try {
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
    }, 5000);
  } catch {
    console.warn("Web Vitals monitoring not available");
  }
}

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: true,
            refetchOnMount: true,
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
