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
import {
  getSupportContactText,
  SUPPORT_EMAIL,
} from "@/lib/support-contact";
import { readInAppNavCount } from "@/providers/navigation-history-provider";

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
          "We couldn't connect right now. Please check your internet connection and try again.",
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
            action: () => {
              if (readInAppNavCount() > 1) {
                window.history.back();
                return;
              }
              window.location.href = "/dashboard";
            },
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
      title: "We could not load this page",
      message: `We couldn't load this page. Please try again. If it continues, ${getSupportContactText()}.`,
      actions: [
        {
          label: "Reload Application",
          action: () => window.location.reload(),
          icon: <RefreshCw className="h-4 w-4" />,
        },
        {
          label: `Email ${SUPPORT_EMAIL}`,
          action: () => (window.location.href = `mailto:${SUPPORT_EMAIL}`),
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
          <Card className="max-w-md w-full border-destructive/20 shadow-md">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="ui-section-title text-[var(--fs-xl)]">
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
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
