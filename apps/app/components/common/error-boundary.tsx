"use client";

import Link from "next/link";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, Home, RefreshCcw } from "lucide-react";
import { captureException, captureMessage } from "@/lib/sentry.client.config";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureException(error, {
      react: {
        componentStack: errorInfo.componentStack,
      },
    });

    captureMessage(`React Component Error: ${error.message}`, "error");
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-card rounded-xl border border-border shadow-sm">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground max-w-md mb-4">
            An unexpected error occurred while rendering this section. Our team
            has been notified and will investigate.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium transition-colors hover:bg-primary/90"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium transition-colors hover:bg-secondary/80"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
