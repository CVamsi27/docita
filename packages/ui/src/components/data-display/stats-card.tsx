"use client";

import { cn } from "../../lib/utils";
import { Card, CardContent } from "../indicators/card";
import { LucideIcon } from "lucide-react";

interface GradientStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "primary" | "success" | "info" | "warning";
  badge?: React.ReactNode;
  className?: string;
}

const colorStyles = {
  primary: {
    surface: "border-primary/20 bg-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  success: {
    surface: "border-success/20 bg-success/5",
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  info: {
    surface: "border-info/20 bg-info/5",
    iconBg: "bg-info/10",
    iconColor: "text-info",
  },
  warning: {
    surface: "border-warning/20 bg-warning/5",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
};

export function GradientStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "primary",
  badge,
  className,
}: GradientStatCardProps) {
  const styles = colorStyles[variant];

  return (
    <Card
      className={cn(
        "overflow-hidden shadow-sm transition-[box-shadow,transform] duration-200 hover:shadow-md hover:-translate-y-0.5",
        styles.surface,
        className,
      )}
// jscpd:ignore-start
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg sm:size-14",
              styles.iconBg,
              styles.iconColor,
            )}
          >
            <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
          </div>
          <div className="flex-1 min-w-0">
{/* jscpd:ignore-end */}
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-[var(--fs-2xl)] sm:text-[var(--fs-3xl)] font-semibold leading-[var(--lh-tight)] tabular-nums">
                {value}
              </h3>
              {subtitle && (
                <span className="text-xs text-muted-foreground">
                  {subtitle}
                </span>
              )}
              {badge}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionCardProps {
  icon: LucideIcon;
  label: string;
  variant?: "primary" | "success" | "info" | "warning";
  badge?: string | number;
  className?: string;
}

const actionColorStyles = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
  },
  success: {
    bg: "bg-success/10",
    text: "text-success",
  },
  info: {
    bg: "bg-info/10",
    text: "text-info",
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
  },
};

export function QuickActionCard({
  icon: Icon,
  label,
  variant = "primary",
  badge,
  className,
}: QuickActionCardProps) {
  const styles = actionColorStyles[variant];

  return (
    <Card
      className={cn(
        "group relative h-full cursor-pointer overflow-hidden border transition-[border-color,background-color,box-shadow,transform] duration-200 hover:border-primary/30 hover:bg-muted/20 hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <div
          className={cn(
            "mb-3 rounded-lg p-3 transition-colors duration-150",
            styles.bg,
          )}
        >
          <Icon className={cn("h-6 w-6", styles.text)} />
        </div>
        <p className="font-medium text-sm">{label}</p>
        {badge !== undefined && (
          <span className="mt-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {badge} pending
          </span>
        )}
      </CardContent>
    </Card>
  );
}

interface ProgressStatProps {
  label: string;
  value: string | number;
  progress: number;
  description?: string;
  variant?: "primary" | "success" | "info" | "warning";
  className?: string;
}

const progressColors = {
  primary: "bg-primary",
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
};

const progressTextColors = {
  primary: "text-primary",
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
};

export function ProgressStat({
  label,
  value,
  progress,
  description,
  variant = "primary",
  className,
}: ProgressStatProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-semibold", progressTextColors[variant])}>
          {value}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            progressColors[variant],
          )}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
