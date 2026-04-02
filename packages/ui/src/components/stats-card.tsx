"use client";

import { cn } from "../lib/utils";
import { Card, CardContent } from "./card";
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
    gradient: "from-primary/20 to-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  success: {
    gradient: "from-success/20 to-success/5",
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  info: {
    gradient: "from-info/20 to-info/5",
    iconBg: "bg-info/10",
    iconColor: "text-info",
  },
  warning: {
    gradient: "from-warning/20 to-warning/5",
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
        "overflow-hidden border-none shadow-sm transition-colors duration-150 hover:shadow-md",
        `bg-linear-to-br ${styles.gradient}`,
        className,
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl",
              styles.iconBg,
              styles.iconColor,
            )}
          >
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold">{value}</h3>
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
        "group relative h-full cursor-pointer overflow-hidden border transition-colors duration-150 hover:border-primary/30 hover:bg-muted/20 hover:shadow-md",
        className,
      )}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <div
          className={cn(
            "mb-3 rounded-2xl p-3 transition-colors duration-150",
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
            "h-full rounded-full transition-colors duration-150",
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
