import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { UserPlus, Users } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export interface QuickAction {
  href: string;
  icon: typeof UserPlus;
  label: string;
  shortLabel: string;
  badge?: number;
}

interface DashboardQuickActionsUIProps {
  quickActions: QuickAction[];
}

export function DashboardQuickActionsUI({
  quickActions,
}: DashboardQuickActionsUIProps) {
  const { t } = useTranslation("Dashboard");
  const actions = [
    ...quickActions,
    {
      href: "/patients",
      icon: Users,
      label: t("quickActions.allPatients"),
      shortLabel: t("quickActions.patients"),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-7">
      {actions.map((action, idx) => (
        <Link
          key={action.href}
          to={action.href}
          className={cn(
            "group flex min-h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-border/70 p-3 text-center transition-colors duration-150 shadow-xs",
            "bg-card hover:bg-muted/40 hover:border-border",
          )}
        >
          <div
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/80 shadow-xs sm:h-12 sm:w-12 transition-colors duration-150",
              idx === 0
                ? "bg-primary text-primary-foreground border-primary/40"
                : "text-primary group-hover:bg-primary/10 group-hover:border-primary/30",
            )}
          >
            <action.icon
              className={cn(
                "h-5 w-5 sm:h-6 sm:w-6 transition-colors duration-150",
                idx === 0 ? "text-primary-foreground" : "text-primary",
              )}
            />
            {action.badge && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1 ring-2 ring-background">
                {action.badge}
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-150 text-center">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
