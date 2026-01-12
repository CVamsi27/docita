"use client";

import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

// =============================================================================
// STATUS BADGE
// =============================================================================

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
  /** The status to display */
  status: StatusType | string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "default";
  /** Custom label override */
  label?: string;
}

const statusStyles: Record<StatusType, string> = {
  // Appointment statuses
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  scheduled:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",

  // Queue statuses
  waiting:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "no-show": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",

  // Lab test statuses
  processing:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ordered: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  "sample-collected":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",

  // General statuses
  "in-progress":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",

  // Payment statuses
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  unpaid: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",

  // Generic statuses
  success:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

// Custom labels for some statuses
const statusLabels: Partial<Record<StatusType, string>> = {
  "in-progress": "In Consultation",
  "sample-collected": "In Progress",
  "no-show": "No Show",
};

/**
 * Status Badge Component
 *
 * Displays a colored badge based on the status value.
 * Automatically maps statuses to appropriate colors.
 *
 * @example
 * ```tsx
 * import { StatusBadge } from "@workspace/ui/components/status-badge";
 *
 * function AppointmentRow({ appointment }) {
 *   return (
 *     <tr>
 *       <td>{appointment.patient}</td>
 *       <td><StatusBadge status={appointment.status} /></td>
 *     </tr>
 *   );
 * }
 * ```
 */
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

// =============================================================================
// PRIORITY BADGE
// =============================================================================

export type PriorityType = "low" | "medium" | "high" | "urgent" | "critical";

export interface PriorityBadgeProps {
  /** The priority level */
  priority: PriorityType | string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the dot indicator */
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

/**
 * Priority Badge Component
 *
 * Displays a priority level with optional dot indicator.
 *
 * @example
 * ```tsx
 * import { PriorityBadge } from "@workspace/ui/components/status-badge";
 *
 * function TaskItem({ task }) {
 *   return (
 *     <div>
 *       <span>{task.title}</span>
 *       <PriorityBadge priority={task.priority} />
 *     </div>
 *   );
 * }
 * ```
 */
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

// =============================================================================
// ONLINE STATUS INDICATOR
// =============================================================================

export interface OnlineStatusProps {
  /** Whether the entity is online */
  online?: boolean;
  /** Custom label override */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Online Status Indicator
 *
 * Shows a dot indicator for online/offline status.
 *
 * @example
 * ```tsx
 * import { OnlineStatus } from "@workspace/ui/components/status-badge";
 *
 * function UserRow({ user }) {
 *   return (
 *     <div>
 *       <span>{user.name}</span>
 *       <OnlineStatus online={user.isOnline} />
 *     </div>
 *   );
 * }
 * ```
 */
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

// =============================================================================
// HELPER: Get status color class
// =============================================================================

/**
 * Get the Tailwind color class for a status
 *
 * @param status - The status value
 * @returns The Tailwind class string for the status color
 */
export function getStatusColor(status: StatusType | string): string {
  const normalizedStatus = status
    .toLowerCase()
    .replace(/_/g, "-") as StatusType;
  return statusStyles[normalizedStatus] || statusStyles.info;
}
