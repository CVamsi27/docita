import type React from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { sanitizeUserFacingMessage } from "@workspace/types";

import { EmptyState, LoadingState } from "@workspace/ui/components/feedback/empty-state";
import { ErrorState } from "@workspace/ui/components/feedback/error-state";

export type DataStateStatus = "loading" | "error" | "empty" | "success";

interface DataStateProps {
  status: DataStateStatus;
  children?: React.ReactNode;
  loadingMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function DataState({
  status,
  children,
  loadingMessage = "Loading…",
  errorMessage = "We could not load this section. Please try again.",
  onRetry,
  emptyTitle = "Nothing to show",
  emptyDescription,
  emptyIcon,
  emptyAction,
  className,
}: DataStateProps) {
  if (status === "loading") {
    return <LoadingState message={loadingMessage} className={className} />;
  }

  if (status === "error") {
    return (
      <ErrorState
        message={sanitizeUserFacingMessage(
          errorMessage,
          "We could not load this section. Please try again.",
        )}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  if (status === "empty") {
    return (
      <EmptyState
        icon={emptyIcon ?? Inbox}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return <>{children}</>;
}
