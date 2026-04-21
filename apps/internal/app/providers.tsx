"use client";

import { AuthProvider } from "@/lib/auth";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { APIRequestError } from "@workspace/data-access";
import { NavigationHistoryProvider } from "@/providers/navigation-history-provider";

const TOAST_DURATION_MS = 5000;
const TOAST_VISIBLE_COUNT = Number.POSITIVE_INFINITY;

export function Providers({ children }: { children: ReactNode }) {
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
                if (error.status !== undefined && error.status < 500) {
                  return false;
                }
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
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationHistoryProvider>{children}</NavigationHistoryProvider>
          <Toaster
            closeButton
            duration={TOAST_DURATION_MS}
            expand
            richColors
            position="top-right"
            visibleToasts={TOAST_VISIBLE_COUNT}
          />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
