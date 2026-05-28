"use client";

import type { ReactNode } from "react";
import { ErrorBoundary as UIErrorBoundary } from "@workspace/ui/components/feedback/error-boundary";
import {
  captureException,
  captureMessage,
} from "@/lib/monitoring/sentry.client.config";

export function ErrorBoundary({
  children,
  fallback,
}: {
  children?: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <UIErrorBoundary
      fallback={fallback}
      onError={(error, info) => {
        captureException(error, {
          react: {
            componentStack: info.componentStack,
          },
        });
        captureMessage(`React Component Error: ${error.message}`, "error");
      }}
    >
      {children}
    </UIErrorBoundary>
  );
}

export function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
