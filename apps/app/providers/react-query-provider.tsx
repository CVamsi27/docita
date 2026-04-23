"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { ApiError } from "@/lib/errors";
import { QUERY_GC_TIMES } from "@/lib/react-query-config";

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

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
