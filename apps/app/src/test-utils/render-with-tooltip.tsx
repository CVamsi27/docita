import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";

/**
 * Render with just TooltipProvider — for tests that need tooltip context
 * but don't need the MemoryRouter from the default test-utils render.
 */
export function renderWithTooltip(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TooltipProvider>{children}</TooltipProvider>
    ),
    ...options,
  });
}
