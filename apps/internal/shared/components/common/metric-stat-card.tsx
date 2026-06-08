"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";

export interface MetricStatCardProps {
  /** Card title shown next to the icon. */
  title: string;
  /** Headline value (e.g. a formatted count, percentage, or duration). */
  value: React.ReactNode;
  /** Supporting copy shown beneath the headline value. */
  description: React.ReactNode;
  /** Leading icon rendered in the header. */
  icon: LucideIcon;
  /** Extra classes for the headline value (e.g. `text-success` for "good" metrics). */
  valueClassName?: string;
  /** Optional content rendered between the value and description (e.g. a progress bar). */
  children?: React.ReactNode;
}

/**
 * Compact monitoring/perf stat card: title + icon header, headline value, and
 * supporting description. Shared between the system-monitoring and performance
 * dashboards so the layout stays visually and structurally consistent.
 */
export function MetricStatCard({
  title,
  value,
  description,
  icon: Icon,
  valueClassName,
  children,
}: MetricStatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className={children ? "space-y-2" : undefined}>
        <div
          className={cn(
            "text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]",
            valueClassName,
          )}
        >
          {value}
        </div>
        {children}
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
