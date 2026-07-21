"use client";

import { CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import type { AbdmReadinessStatus } from "@workspace/types";
import {
  Badge,
  Skeleton
} from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";

export function formatInrFromPaise(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function statusBadge(status: AbdmReadinessStatus) {
  if (status === "READY") {
    return {
      label: "Ready",
      className: "border-primary/30 text-primary",
      Icon: CheckCircle2,
    };
  }
  if (status === "BLOCKED") {
    return {
      label: "Blocked",
      className: "border-destructive/30 text-destructive",
      Icon: ShieldAlert,
    };
  }
  if (status === "PLANNED") {
    return {
      label: "Planned",
      className: "text-muted-foreground",
      Icon: Clock,
    };
  }
  return {
    label: "Pending",
    className: "text-muted-foreground",
    Icon: Clock,
  };
}

export function StatusBadge({ status }: { status: AbdmReadinessStatus }) {
  const badge = statusBadge(status);
  return (
    <Badge variant="outline" className={cn("gap-1.5", badge.className)}>
      <badge.Icon className="h-3.5 w-3.5" />
      {badge.label}
    </Badge>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-lg" />
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  );
}

export function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 px-4 py-3">
      <p className="ui-eyebrow">{label}</p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
      {detail ? (
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}
