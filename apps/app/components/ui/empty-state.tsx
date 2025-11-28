"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { LucideIcon, Loader2 } from "lucide-react";

// =============================================================================
// EMPTY STATE
// =============================================================================

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

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

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

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
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
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
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Button>
        ))}
    </div>
  );
}

// =============================================================================
// LOADING STATE
// =============================================================================

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}

const sizeClasses = {
  sm: { icon: "h-6 w-6", text: "text-sm" },
  default: { icon: "h-8 w-8", text: "text-base" },
  lg: { icon: "h-12 w-12", text: "text-lg" },
};

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
