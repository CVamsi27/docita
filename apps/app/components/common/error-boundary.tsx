"use client";

import Link from "next/link";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, Home, RefreshCcw } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
        <div className="flex min-h-[400px] items-center justify-center p-6 text-center">
          <Card className="w-full max-w-md">
            <CardHeader className="items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-normal">
                We could not load this section
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Please try again or go back to the home page.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={this.handleReset} className="gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button asChild variant="secondary" className="gap-2">
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    Go Home
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
