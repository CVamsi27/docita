/**
 * Enhanced Error Boundary with User-Friendly Messages
 *
 * UI/UX IMPROVEMENTS:
 * - Translates technical errors to user-friendly messages
 * - Provides actionable recovery options
 * - Tracks errors for monitoring
 * - Graceful degradation
 */

"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { AlertCircle, Home, Mail, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface UserFriendlyError {
  title: string;
  message: string;
  actions: Array<{
    label: string;
    action: () => void;
    variant?: "default" | "outline" | "destructive";
    icon?: ReactNode;
  }>;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error("Error caught by boundary:", error, errorInfo);

    // Send to error tracking (Sentry, etc.)
    if (
      typeof window !== "undefined" &&
      (window as unknown as Record<string, unknown>).Sentry
    ) {
      (
        (window as unknown as Record<string, unknown>).Sentry as {
          captureException: (err: Error, opts: Record<string, unknown>) => void;
        }
      ).captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  private getUserFriendlyError(): UserFriendlyError {
    const { error } = this.state;

    if (!error) {
      return this.getDefaultError();
    }

    // Network errors
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return {
        title: "Connection Issue",
        message:
          "We couldn't connect to our servers. Please check your internet connection and try again.",
        actions: [
          {
            label: "Retry",
            action: () => window.location.reload(),
            icon: <RefreshCw className="mr-2 h-4 w-4" />,
          },
        ],
      };
    }

    // Authentication errors
    if (
      error.message.includes("401") ||
      error.message.includes("Unauthorized")
    ) {
      return {
        title: "Session Expired",
        message: "Your session has expired. Please log in again to continue.",
        actions: [
          {
            label: "Go to Login",
            action: () => (window.location.href = "/login"),
            icon: <Home className="mr-2 h-4 w-4" />,
          },
        ],
      };
    }

    // Permission errors
    if (error.message.includes("403") || error.message.includes("Forbidden")) {
      return {
        title: "Access Denied",
        message:
          "You don't have permission to access this feature. Please contact your administrator if you believe this is an error.",
        actions: [
          {
            label: "Go to Dashboard",
            action: () => (window.location.href = "/dashboard"),
            icon: <Home className="mr-2 h-4 w-4" />,
          },
          {
            label: "Contact Support",
            action: () => (window.location.href = "mailto:support@docita.work"),
            variant: "outline",
            icon: <Mail className="mr-2 h-4 w-4" />,
          },
        ],
      };
    }

    // Subscription errors
    if (
      error.message.includes("subscription") ||
      error.message.includes("upgrade")
    ) {
      return {
        title: "Upgrade Required",
        message:
          "This feature is not available on your current plan. Upgrade to unlock more features.",
        actions: [
          {
            label: "View Plans",
            action: () => (window.location.href = "/upgrade"),
            icon: <RefreshCw className="mr-2 h-4 w-4" />,
          },
          {
            label: "Go Back",
            action: () => window.history.back(),
            variant: "outline",
          },
        ],
      };
    }

    // Generic error
    return this.getDefaultError();
  }

  private getDefaultError(): UserFriendlyError {
    return {
      title: "Something Went Wrong",
      message:
        "We encountered an unexpected error. Our team has been notified and is working on a fix.",
      actions: [
        {
          label: "Refresh Page",
          action: () => window.location.reload(),
          icon: <RefreshCw className="mr-2 h-4 w-4" />,
        },
        {
          label: "Go to Dashboard",
          action: () => (window.location.href = "/dashboard"),
          variant: "outline",
          icon: <Home className="mr-2 h-4 w-4" />,
        },
      ],
    };
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const userError = this.getUserFriendlyError();

      return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{userError.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground text-base leading-relaxed">
                {userError.message}
              </p>

              <div className="flex flex-wrap gap-3">
                {userError.actions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={action.action}
                    variant={action.variant || "default"}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>

              {/* Technical details (collapsed by default, for debugging) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-6 p-4 bg-muted rounded-lg">
                  <summary className="cursor-pointer font-medium text-sm">
                    Technical Details (Development Only)
                  </summary>
                  <div className="mt-4 space-y-2">
                    <div>
                      <strong className="text-xs">Error:</strong>
                      <pre className="mt-1 text-xs overflow-auto p-2 bg-background rounded">
                        {this.state.error.toString()}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong className="text-xs">Component Stack:</strong>
                        <pre className="mt-1 text-xs overflow-auto p-2 bg-background rounded max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
