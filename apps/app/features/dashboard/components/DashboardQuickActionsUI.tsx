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
            "flex flex-col items-center justify-center gap-2 min-w-22 sm:min-w-24 p-3 rounded-2xl transition-all duration-300 snap-start group",
            "bg-card/40 backdrop-blur-md border border-transparent hover:border-primary/20",
            "hover:bg-card/60 hover:shadow-lg hover:-translate-y-0.5",
          )}
        >
          <div
            className={cn(
              "h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-sm",
              idx === 0
                ? "bg-primary text-primary-foreground shadow-primary/25"
                : "bg-background/80 text-primary hover:bg-primary/10",
            )}
          >
            <action.icon
              className={cn(
                "h-5 w-5 sm:h-6 sm:w-6",
                idx === 0 ? "text-primary-foreground" : "text-primary",
              )}
            />
            {action.badge && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 ring-2 ring-background">
                {action.badge}
              </span>
            )}
          </div>
          <span className="text-[10px] sm:text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
            {action.label}
          </span>
        </Link>
      ))}

      <div className="w-px h-12 bg-border/50 mx-2 hidden sm:block" />

      <Link
        href="/patients"
        className="hidden sm:flex flex-col items-center justify-center gap-2 min-w-20 p-3 rounded-2xl hover:bg-card/40 transition-all group"
      >
        <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
          <Users className="h-5 w-5" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
          All Patients
        </span>
      </Link>
    </div>
  );
}
