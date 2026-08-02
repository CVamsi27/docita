import { render as rtlRender, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";

interface WrapperOptions {
  initialEntries?: string[];
}

/**
 * Custom render that wraps every test with MemoryRouter + TooltipProvider.
 * This provides the router context that react-router's Link/useNavigate need,
 * and TooltipProvider for components that use tooltips.
 */
export function render(
  ui: ReactElement,
  options?: RenderOptions & WrapperOptions,
): RenderResult {
  const { initialEntries, ...renderOptions } = options ?? {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <TooltipProvider>{children}</TooltipProvider>
      </MemoryRouter>
    );
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

export { renderWithTooltip } from "./render-with-tooltip";
export { screen, cleanup, act, fireEvent, waitFor } from "@testing-library/react";
