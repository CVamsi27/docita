"use client";

import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

export type StatusType =
  | "completed"
  | "confirmed"
  | "scheduled"
  | "cancelled"
  | "pending"
  | "in-progress"
  | "active"
  | "inactive"
  | "draft"
  | "paid"
  | "unpaid"
  | "overdue"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "waiting"
  | "no-show"
  | "processing"
  | "ordered"
  | "sample-collected";

export interface StatusBadgeProps {
  
  status: StatusType | string;
  
  className?: string;
  
  size?: "sm" | "default";
  
  label?: string;
}

const statusStyles: Record<StatusType, string> = {
  completed: "badge-completed",
  confirmed: "badge-info",
  scheduled: "badge-processing",
  cancelled: "badge-cancelled",
  pending: "badge-pending",
  waiting: "badge-pending",
  "no-show": "badge-cancelled",
  processing: "badge-processing",
  ordered: "badge-muted",
  "sample-collected": "badge-processing",
  "in-progress": "badge-processing",
  active: "badge-active",
  inactive: "badge-inactive",
  draft: "badge-muted",
  paid: "badge-success",
  unpaid: "badge-cancelled",
  overdue: "badge-cancelled",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-danger",
  info: "badge-info",
};

const statusLabels: Partial<Record<StatusType, string>> = {
  "in-progress": "In Consultation",
  "sample-collected": "In Progress",
  "no-show": "No Show",
};

export function StatusBadge({
  status,
  className,
  size = "default",
  label,
}: StatusBadgeProps) {
  const normalizedStatus = status
    .toLowerCase()
    .replace(/_/g, "-") as StatusType;
  const styleClass = statusStyles[normalizedStatus] || statusStyles.info;
  const displayLabel =
    label ||
    statusLabels[normalizedStatus] ||
    status.replace(/_/g, " ").replace(/-/g, " ");

  return (
    <Badge
      variant="secondary"
      className={cn(
        "capitalize font-medium border-0",
        styleClass,
        size === "sm" && "text-xs px-2 py-0.5",
        className,
      )}
    >
      {displayLabel}
    </Badge>
  );
}

export type PriorityType = "low" | "medium" | "high" | "urgent" | "critical";

export interface PriorityBadgeProps {
  
  priority: PriorityType | string;
  
  className?: string;
  
  showDot?: boolean;
}

const priorityStyles: Record<PriorityType, { bg: string; dot: string }> = {
  low: {
    bg: "badge-muted",
    dot: "bg-muted-foreground",
  },
  medium: {
    bg: "badge-info",
    dot: "bg-info",
  },
  high: {
    bg: "badge-warning",
    dot: "bg-warning",
  },
  urgent: {
    bg: "badge-danger",
    dot: "bg-destructive",
  },
  critical: {
    bg: "badge-danger animate-pulse",
    dot: "bg-destructive animate-pulse",
  },
};

export function PriorityBadge({
  priority,
  className,
  showDot = true,
}: PriorityBadgeProps) {
  const normalizedPriority = priority.toLowerCase() as PriorityType;
  const styles = priorityStyles[normalizedPriority] || priorityStyles.medium;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "capitalize font-medium border-0 gap-1.5",
        styles.bg,
        className,
      )}
    >
      {showDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
      )}
      {priority}
    </Badge>
  );
}

export interface OnlineStatusProps {
  
  online?: boolean;
  
  label?: string;
  
  className?: string;
}

export function OnlineStatus({
  online = false,
  label,
  className,
}: OnlineStatusProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          online ? "bg-success" : "bg-muted-foreground",
        )}
      />
      {label !== undefined && (
        <span className="text-sm text-muted-foreground">
          {label || (online ? "Online" : "Offline")}
        </span>
      )}
    </div>
  );
}

export function getStatusColor(status: StatusType | string): string {
  const normalizedStatus = status
    .toLowerCase()
    .replace(/_/g, "-") as StatusType;
  return statusStyles[normalizedStatus] || statusStyles.info;
}
