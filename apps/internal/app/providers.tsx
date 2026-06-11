"use client";

import { AuthProvider } from "@/lib/auth/auth";
import { Toaster } from "sonner";
import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { APIRequestError } from "@workspace/data-access";
import { NavigationHistoryProvider } from "@/providers/navigation-history-provider";
import { InternalWebVitalsReporter } from "@/components/internal-web-vitals-reporter";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { ThemeProvider } from "next-themes";
import { InternalDataAccessBridge } from "@/app/data-access-bridge";

const TOAST_DURATION_MS = 5000;
const TOAST_VISIBLE_COUNT = Number.POSITIVE_INFINITY;

export function Providers({
  children,
  nonce,
}: {
  children: ReactNode;
  nonce?: string;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            retry: (failureCount: number, error: unknown) => {
              if (error instanceof APIRequestError) {
                if (error.status !== undefined && error.status < 500)
                  return false;
              }
              return failureCount < 2;
            },
          },
          mutations: {
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      enableColorScheme
      storageKey="theme"
      nonce={nonce}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <InternalDataAccessBridge>
            <TooltipProvider delayDuration={300}>
              <NavigationHistoryProvider>
                <InternalWebVitalsReporter />
                {children}
              </NavigationHistoryProvider>
            </TooltipProvider>
            <Toaster
              closeButton
              duration={TOAST_DURATION_MS}
              expand
              richColors
              position="top-right"
              visibleToasts={TOAST_VISIBLE_COUNT}
            />
          </InternalDataAccessBridge>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
