"use client";

import { AuthProvider } from "@/lib/auth";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { APIRequestError } from "@workspace/data-access";

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
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
