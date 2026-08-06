import type { ReactNode } from "react";
import { ErrorBoundary as UIErrorBoundary } from "@workspace/ui/components/feedback/error-boundary";

export function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  return <UIErrorBoundary>{children}</UIErrorBoundary>;
}