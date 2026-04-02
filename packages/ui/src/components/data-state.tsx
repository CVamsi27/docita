import type React from "react";
import type { LucideIcon } from "lucide-react";

import { EmptyState, LoadingState } from "@workspace/ui/components/empty-state";
import { ErrorState } from "@workspace/ui/components/error-state";

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
  loadingMessage = "Loading...",
  errorMessage = "Something went wrong. Please try again.",
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
        message={errorMessage}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  if (status === "empty") {
    if (!emptyIcon) {
      throw new Error("DataState requires emptyIcon when status is 'empty'.");
    }

    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return <>{children}</>;
}
