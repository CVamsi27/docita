import {
  render as rtlRender,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {UserWrapper ? <UserWrapper>{children}</UserWrapper> : children}
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  return rtlRender(ui, { ...options, wrapper: Wrapper });
}
