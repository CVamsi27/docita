import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export interface QuickAction {
  href: string;
  icon: typeof UserPlus;
  label: string;
  shortLabel: string;
  badge?: number;
}

export interface DashboardQuickActionsUIProps {
  quickActions: QuickAction[];
}

export function DashboardQuickActionsUI({
  quickActions,
}: DashboardQuickActionsUIProps) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory">
      {quickActions.map((action, idx) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            "group flex min-w-[72px] snap-start flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-transparent p-3 transition-colors duration-150 sm:min-w-24",
            "bg-card hover:bg-muted/40 hover:border-border/80",
          )}
        >
          <div
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70 shadow-sm sm:h-12 sm:w-12",
              idx === 0
                ? "bg-foreground text-background border-border/40"
                : "text-primary hover:bg-background/85",
            )}
          >
            <action.icon
              className={cn(
                "h-5 w-5 sm:h-6 sm:w-6",
                idx === 0 ? "text-background" : "text-primary",
              )}
            />
            {action.badge && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1 ring-2 ring-background">
                {action.badge}
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
            {action.label}
          </span>
        </Link>
      ))}

      <div className="w-px h-12 bg-border/50 mx-2 hidden sm:block" />

      <Link
        href="/patients"
        className="group hidden min-w-20 flex-col items-center justify-center gap-2 rounded-lg p-3 transition-colors duration-150 hover:bg-muted/40 sm:flex"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-colors group-hover:text-foreground">
          <Users className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
          All Patients
        </span>
      </Link>
    </div>
  );
}
