"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { ChevronRight, LucideIcon } from "lucide-react";

import { DocitaLoadingIndicator } from "./docita-loading-indicator";

export interface EmptyStateProps {
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
    <div
      className={cn(
        "ui-section-stack py-8 text-center text-muted-foreground",
        className,
      )}
    >
      <div className="mx-auto flex size-16 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <div className="ui-copy-stack">
        <p className="ui-section-title">{title}</p>
        {description ? (
          <p className="ui-section-subtitle">{description}</p>
        ) : null}
      </div>
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

export interface SectionHeaderProps {
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
        "flex flex-row items-center justify-between gap-3 pb-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="ui-copy-stack">
          <h3 className="ui-section-title">{title}</h3>
          {subtitle && <p className="ui-section-subtitle">{subtitle}</p>}
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

export interface LoadingStateProps {
  message?: string;

  className?: string;

  size?: "sm" | "default" | "lg";
}

const sizeClasses = {
  sm: { icon: "h-8 w-8", text: "text-sm" },
  default: { icon: "h-10 w-10", text: "text-base" },
  lg: { icon: "h-12 w-12", text: "text-lg" },
};

export function LoadingState({
  message = "Loading…",
  className,
  size = "default",
}: LoadingStateProps) {
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        "ui-section-stack py-8 text-center text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <DocitaLoadingIndicator
        variant="section"
        className="gap-3"
        iconClassName={sizes.icon}
        withStatusRole={false}
        iconAlt=""
      />
      <p className={sizes.text}>{message}</p>
    </div>
  );
}
