import Link from "next/link";
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

export interface AlertItem {
  id: string;
  type: "urgent" | "info" | "success" | "warning";
  icon: typeof AlertCircle;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
  dismissible?: boolean;
}

export interface DashboardAlertsUIProps {
  alerts: AlertItem[];
  progressPercentage: number;
  todayAppointments: number;
  completedAppointments: number;
  onDismissAlert: (id: string) => void;
  className?: string;
}

export function DashboardAlertsUI({
  alerts,
  progressPercentage,
  todayAppointments,
  completedAppointments,
  onDismissAlert,
  className,
}: DashboardAlertsUIProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {alerts.slice(0, 3).map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border transition-all",
            alert.type === "urgent" &&
              "bg-destructive/10 border-destructive/30",
            alert.type === "warning" && "bg-amber-500/10 border-amber-500/30",
            alert.type === "success" && "bg-green-500/10 border-green-500/30",
            alert.type === "info" && "bg-primary/5 border-primary/20",
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
              alert.type === "urgent" && "bg-destructive/20 text-destructive",
              alert.type === "warning" && "bg-amber-500/20 text-amber-600",
              alert.type === "success" && "bg-green-500/20 text-green-600",
              alert.type === "info" && "bg-primary/20 text-primary",
            )}
          >
            <alert.icon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight">{alert.title}</p>
            {alert.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {alert.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {alert.action && (
              <Button
                asChild
                size="sm"
                variant={alert.type === "urgent" ? "destructive" : "outline"}
                className="h-7 text-xs"
              >
                <Link href={alert.action.href}>
                  {alert.action.label}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
            {alert.dismissible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => onDismissAlert(alert.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Progress bar */}
      {todayAppointments > 0 && (
        <div className="flex items-center gap-3 px-1">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500",
                progressPercentage === 100 ? "bg-green-500" : "bg-primary",
              )}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {completedAppointments}/{todayAppointments}
          </span>
        </div>
      )}
    </div>
  );
}

// AlertStrip component
export function AlertStripUI({
  message,
  type = "info",
  action,
  onDismiss,
}: {
  message: string;
  type?: "urgent" | "info" | "warning" | "success";
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-2 text-sm",
        type === "urgent" && "bg-destructive text-destructive-foreground",
        type === "warning" && "bg-amber-500 text-white",
        type === "success" && "bg-green-500 text-white",
        type === "info" && "bg-primary text-primary-foreground",
      )}
    >
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4" />
        <span>{message}</span>
      </div>
      <div className="flex items-center gap-2">
        {action && (
          <Button
            size="sm"
            variant="secondary"
            className="h-6 text-xs"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
        {onDismiss && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onDismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
