import {
  render as rtlRender,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataAccessProvider } from "@workspace/data-access";

export function render(
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult {
  const UserWrapper = options?.wrapper;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <DataAccessProvider
        config={{
          fetcher: () => Promise.resolve({ ok: true }),
          getClinicId: () => "clinic-1",
          getClinicTimezone: () => "UTC",
          isTierFeatureEnabled: () => true,
        }}
      >
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            {UserWrapper ? <UserWrapper>{children}</UserWrapper> : children}
          </TooltipProvider>
        </QueryClientProvider>
      </DataAccessProvider>
    );
  }
  return rtlRender(ui, { ...options, wrapper: Wrapper });
}
