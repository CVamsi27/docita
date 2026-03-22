"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";

async function reportWebVitals(): Promise<void> {

  try {
    const vitals: Record<string, number | undefined> = {};

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

    const lcpObserver = new PerformanceObserver((list) => {
      vitals.lcp = list.getEntries().pop()?.startTime;
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

    const fcpObserver = new PerformanceObserver((list) => {
      vitals.fcp = list.getEntries()[0]?.startTime;
    });
    fcpObserver.observe({ type: "paint", buffered: true });

    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceEntry & { responseStart?: number };
    if (navigation) {
      vitals.ttfb = navigation.responseStart;
    }

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
    }, 5000);
  } catch (error) {
    void error;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, 
            refetchOnWindowFocus: false,
            retry: 1, 
          },
        },
      }),
  );

  useEffect(() => {
    reportWebVitals();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
