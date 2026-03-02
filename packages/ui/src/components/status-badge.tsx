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

  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  scheduled:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",

  waiting:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "no-show": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",

  processing:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ordered: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  "sample-collected":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",

  "in-progress":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",

  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  unpaid: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",

  success:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
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
    bg: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    dot: "bg-gray-500",
  },
  medium: {
    bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  high: {
    bg: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  urgent: {
    bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
  },
  critical: {
    bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse",
    dot: "bg-red-500 animate-pulse",
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
          online ? "bg-green-500" : "bg-gray-400",
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
