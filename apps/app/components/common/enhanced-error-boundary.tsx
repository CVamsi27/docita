"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/common/buttons";
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

interface SentryGlobal {
  captureException: (error: Error, options?: Record<string, unknown>) => void;
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

    if (typeof window !== "undefined") {
      const windowObj = window as Window & { Sentry?: SentryGlobal };
      if (windowObj.Sentry) {
        windowObj.Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        });
      }
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

    const message = error.message.toLowerCase();

    if (message.includes("fetch") || message.includes("network")) {
      return {
        title: "Connection Issue",
        message:
          "We couldn't connect to our servers. Please check your internet connection and try again.",
        actions: [
          {
            label: "Retry Connection",
            action: () => window.location.reload(),
            icon: <RefreshCw className="h-4 w-4" />,
          },
        ],
      };
    }

    if (
      message.includes("permission") ||
      message.includes("access") ||
      message.includes("403")
    ) {
      return {
        title: "Access Denied",
        message:
          "You don't have permission to view this section. Please contact your administrator if you believe this is an error.",
        actions: [
          {
            label: "Go to Dashboard",
            action: () => (window.location.href = "/dashboard"),
            icon: <Home className="h-4 w-4" />,
          },
        ],
      };
    }

    if (message.includes("not found") || message.includes("404")) {
      return {
        title: "Item Not Found",
        message:
          "The record or page you're looking for was not found. It might have been deleted or moved.",
        actions: [
          {
            label: "Go Back",
            action: () => window.history.back(),
            variant: "outline",
          },
          {
            label: "Home",
            action: () => (window.location.href = "/dashboard"),
            icon: <Home className="h-4 w-4" />,
          },
        ],
      };
    }

    return this.getDefaultError();
  }

  private getDefaultError(): UserFriendlyError {
    return {
      title: "Something Went Wrong",
      message:
        "An unexpected error occurred in the application. We've been notified and are looking into it.",
      actions: [
        {
          label: "Reload Application",
          action: () => window.location.reload(),
          icon: <RefreshCw className="h-4 w-4" />,
        },
        {
          label: "Contact Support",
              action: () => (window.location.href = "mailto:support@docita.work"),
          variant: "outline",
          icon: <Mail className="h-4 w-4" />,
        },
      ],
    };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const userError = this.getUserFriendlyError();

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-destructive/20 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {userError.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-muted-foreground leading-relaxed">
                {userError.message}
              </p>

              <div className="flex flex-col gap-2 pt-2">
                {userError.actions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={action.action}
                    variant={action.variant || "default"}
                    className="w-full gap-2 transition-all duration-200"
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="mt-8 text-left p-4 bg-muted rounded-md overflow-hidden">
                  <p className="text-xs font-mono text-destructive font-bold mb-2">
                    Developer Info (Visible in Dev Only):
                  </p>
                  <pre className="text-[10px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto opacity-70">
                    {this.state.error.toString()}
                    {"\n\nComponent Stack:\n"}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
