"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Card, CardContent } from "@workspace/ui/components/card";
import { LucideIcon } from "lucide-react";

// =============================================================================
// GRADIENT STAT CARD (used in dashboard)
// =============================================================================

interface GradientStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: "blue" | "purple" | "green" | "orange" | "red" | "primary";
  badge?: React.ReactNode;
  className?: string;
}

const colorStyles = {
  blue: {
    gradient: "from-blue-500/10 to-blue-500/5",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
  },
  purple: {
    gradient: "from-purple-500/10 to-purple-500/5",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-600",
  },
  green: {
    gradient: "from-green-500/10 to-green-500/5",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-600",
  },
  orange: {
    gradient: "from-orange-500/10 to-orange-500/5",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-600",
  },
  red: {
    gradient: "from-red-500/10 to-red-500/5",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-600",
  },
  primary: {
    gradient: "from-primary/10 to-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
};

export function GradientStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  badge,
  className,
}: GradientStatCardProps) {
  const styles = colorStyles[color];

  return (
    <Card
      className={cn(
        "overflow-hidden border-none shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
        `bg-gradient-to-br ${styles.gradient}`,
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

// =============================================================================
// QUICK ACTION CARD
// =============================================================================

interface QuickActionCardProps {
  icon: LucideIcon;
  label: string;
  color: "blue" | "purple" | "green" | "orange";
  badge?: string | number;
  className?: string;
}

const actionColorStyles = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-600 dark:text-orange-400",
  },
};

export function QuickActionCard({
  icon: Icon,
  label,
  color,
  badge,
  className,
}: QuickActionCardProps) {
  const styles = actionColorStyles[color];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer h-full hover:border-primary/30",
        className,
      )}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <div
          className={cn(
            "rounded-2xl p-3 mb-3 transition-transform group-hover:scale-110",
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

// =============================================================================
// PROGRESS STAT
// =============================================================================

interface ProgressStatProps {
  label: string;
  value: string | number;
  progress: number;
  description?: string;
  color?: "primary" | "green" | "orange" | "yellow" | "purple";
  className?: string;
}

const progressColors = {
  primary: "bg-primary",
  green: "bg-green-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  purple: "bg-purple-500",
};

const progressTextColors = {
  primary: "text-primary",
  green: "text-green-600",
  orange: "text-orange-600",
  yellow: "text-yellow-600",
  purple: "text-purple-600",
};

export function ProgressStat({
  label,
  value,
  progress,
  description,
  color = "primary",
  className,
}: ProgressStatProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-semibold", progressTextColors[color])}>
          {value}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            progressColors[color],
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
