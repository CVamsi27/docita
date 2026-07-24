import { render as rtlRender, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataAccessProvider } from "@workspace/data-access";
import { NextIntlClientProvider } from "next-intl";
import { testDataAccessFetcherStub } from "@/test-utils/data-access-test-fetcher.boundary";

/**
 * Default messages mirror — components that consume useTranslations() need a
 * NextIntlClientProvider in the render tree. Each test that touches translated
 * text should import its own `messages` slice and pass it via `options.messages`
 * (see ClinicGeneralSettings.test.tsx for the per-namespace mirror pattern).
 */
const defaultMessages: Record<string, unknown> = {};

export function render(
  ui: ReactElement,
  options?: RenderOptions & { messages?: Record<string, unknown> },
): RenderResult {
  const UserWrapper = options?.wrapper;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const messages = options?.messages ?? defaultMessages;
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <DataAccessProvider
        config={{
          fetcher: testDataAccessFetcherStub,
          getClinicId: () => "clinic-1",
          getClinicTimezone: () => "UTC",
          isTierFeatureEnabled: () => true,
        }}
      >
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale="en" messages={messages}>
            <TooltipProvider>
              {UserWrapper ? <UserWrapper>{children}</UserWrapper> : children}
            </TooltipProvider>
          </NextIntlClientProvider>
        </QueryClientProvider>
      </DataAccessProvider>
    );
  }
  return rtlRender(ui, { ...options, wrapper: Wrapper });
}
