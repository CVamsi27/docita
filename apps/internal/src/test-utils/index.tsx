import { render as rtlRender, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Custom render that wraps every test with QueryClientProvider.
 * Pages now use useApiQuery (React Query), so tests need this context.
 */
export function render(
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

export { screen, fireEvent, waitFor, within } from "@testing-library/react";
