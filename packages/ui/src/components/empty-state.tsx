"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { ChevronRight, Loader2, LucideIcon } from "lucide-react";

// =============================================================================
// EMPTY STATE
// =============================================================================

export interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Main title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional action button */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * Empty State Component
 *
 * Displays a centered message with an icon when content is empty.
 * Commonly used for empty lists, search results with no matches, etc.
 *
 * @example
 * ```tsx
 * import { EmptyState } from "@workspace/ui/components/empty-state";
 * import { Inbox } from "lucide-react";
 *
 * function PatientsList({ patients }) {
 *   if (patients.length === 0) {
 *     return (
 *       <EmptyState
 *         icon={Inbox}
 *         title="No patients yet"
 *         description="Add your first patient to get started"
 *         action={{ label: "Add Patient", onClick: openModal }}
 *       />
 *     );
 *   }
 *   // render patients...
 * }
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12 text-muted-foreground", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mx-auto mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
      {action &&
        (action.href ? (
          <Button asChild variant="link" className="mt-3">
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button variant="link" className="mt-3" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}

// =============================================================================
// SECTION HEADER
// =============================================================================

export interface SectionHeaderProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Section title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Optional action button */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * Section Header Component
 *
 * A header for content sections with icon, title, and optional action.
 *
 * @example
 * ```tsx
 * import { SectionHeader } from "@workspace/ui/components/empty-state";
 * import { Calendar } from "lucide-react";
 *
 * function AppointmentsSection() {
 *   return (
 *     <div>
 *       <SectionHeader
 *         icon={Calendar}
 *         title="Upcoming Appointments"
 *         subtitle="Next 7 days"
 *         action={{ label: "View All", href: "/appointments" }}
 *       />
 *       // content...
 *     </div>
 *   );
 * }
 * ```
 */
export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-row items-center justify-between space-y-0 pb-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {action &&
        (action.href ? (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-full gap-1"
          >
            <a href={action.href}>
              {action.label}
              <ChevronRight className="h-4 w-4" />
            </a>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full gap-1"
            onClick={action.onClick}
          >
            {action.label}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ))}
    </div>
  );
}

// =============================================================================
// LOADING STATE
// =============================================================================

export interface LoadingStateProps {
  /** Loading message to display */
  message?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "default" | "lg";
}

const sizeClasses = {
  sm: { icon: "h-6 w-6", text: "text-sm" },
  default: { icon: "h-8 w-8", text: "text-base" },
  lg: { icon: "h-12 w-12", text: "text-lg" },
};

/**
 * Loading State Component
 *
 * Displays a loading spinner with optional message.
 *
 * @example
 * ```tsx
 * import { LoadingState } from "@workspace/ui/components/empty-state";
 *
 * function PatientsList({ isLoading }) {
 *   if (isLoading) {
 *     return <LoadingState message="Loading patients..." />;
 *   }
 *   // render content...
 * }
 * ```
 */
export function LoadingState({
  message = "Loading...",
  className,
  size = "default",
}: LoadingStateProps) {
  const sizes = sizeClasses[size];

  return (
    <div className={cn("text-center py-12 text-muted-foreground", className)}>
      <Loader2
        className={cn(sizes.icon, "mx-auto mb-4 animate-spin text-primary")}
      />
      <p className={sizes.text}>{message}</p>
    </div>
  );
}
