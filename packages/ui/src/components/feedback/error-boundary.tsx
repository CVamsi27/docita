"use client";

/**
 * Canonical React error boundary for the workspace.
 *
 * Apps that want Sentry capture pass an `onError` callback (typically
 * wired to `captureException`); the primitive itself stays
 * monitoring-agnostic so it can ship in `@workspace/ui` without taking
 * a hard dependency on a particular monitoring SDK.
 *
 * Consolidates the two former app-local copies under
 * `apps/app/shared/components/{errors,common}/error-boundary.tsx`
 * (the latter has been deleted). SYSTEM_DESIGN_AND_PATTERNS.md §28.3
 * item 37 and the EX1 dupe spotted during the audit.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "@workspace/ui/components/feedback/error-state";

export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Optional override for the default user-facing copy. */
  message?: string;
  /** Optional retry handler. Defaults to a full page reload. */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, info);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
      return;
    }
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    if (this.props.fallback) {
      return this.props.fallback;
    }
    return (
      <ErrorState
        message={
          this.props.message ??
          "We could not load this section. Please try again."
        }
        onRetry={this.handleReset}
      />
    );
  }
}
