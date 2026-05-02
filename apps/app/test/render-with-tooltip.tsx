import {
  render as rtlRender,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { TooltipProvider } from "@workspace/ui/components/tooltip";

export function render(
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult {
  const UserWrapper = options?.wrapper;
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <TooltipProvider>
        {UserWrapper ? <UserWrapper>{children}</UserWrapper> : children}
      </TooltipProvider>
    );
  }
  return rtlRender(ui, { ...options, wrapper: Wrapper });
}
