"use client";

import { Activity, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

type SystemHealthStatus =
  | "healthy"
  | "ok"
  | "warning"
  | "degraded"
  | "critical"
  | "error"
  | "unhealthy"
  | (string & {});

const HEALTHY = new Set(["healthy", "ok"]);
const WARNING = new Set(["warning", "degraded"]);
const FAILING = new Set(["critical", "error", "unhealthy"]);

interface SystemHealthIconProps {
  status: SystemHealthStatus;
  size?: "sm" | "md";
  className?: string;
}

export function SystemHealthIcon({
  status,
  size = "md",
  className,
}: SystemHealthIconProps) {
  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const classes = cn(dim, className);

  if (HEALTHY.has(status)) {
    return <CheckCircle2 className={cn(classes, "text-success")} />;
  }
  if (WARNING.has(status)) {
    return <AlertTriangle className={cn(classes, "text-warning")} />;
  }
  if (FAILING.has(status)) {
    return <XCircle className={cn(classes, "text-destructive")} />;
  }
  return <Activity className={cn(classes, "text-muted-foreground")} />;
}

interface SystemHealthBadgeProps {
  status: SystemHealthStatus;
  label?: string;
  className?: string;
}

export function SystemHealthBadge({
  status,
  label,
  className,
}: SystemHealthBadgeProps) {
  if (HEALTHY.has(status)) {
    return (
      <Badge className={cn("badge-success", className)}>
        {label ?? "Healthy"}
      </Badge>
    );
  }
  if (WARNING.has(status)) {
    return (
      <Badge className={cn("badge-warning", className)}>
        {label ?? (status === "degraded" ? "Degraded" : "Warning")}
      </Badge>
    );
  }
  if (FAILING.has(status)) {
    return (
      <Badge variant="destructive" className={className}>
        {label ?? "Unhealthy"}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={className}>
      {label ?? status}
    </Badge>
  );
}
