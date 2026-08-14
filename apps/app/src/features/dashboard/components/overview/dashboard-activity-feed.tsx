
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
import type { DashboardStats } from "@workspace/types";
import { formatDistanceToNow, getPatientFullName } from "@workspace/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@workspace/ui/components";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { ViewAllLinkUI } from "@/features/dashboard/components/layout/view-all-link-ui";

interface DashboardActivityFeedProps {
  items: DashboardStats["recentActivity"];
}

export function DashboardActivityFeed({ items }: DashboardActivityFeedProps) {
  const { t } = useTranslation("Dashboard");
  return (
    <Card className="border border-border shadow-sm bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-[var(--fs-base)]">
                {t("activity.title")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("activity.description")}
              </CardDescription>
            </div>
          </div>
          <ViewAllLinkUI to="/appointments" text={t("activity.viewAll")} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={t("activity.emptyTitle")}
            description={t("activity.emptyDescription")}
          />
        ) : (
          <ul className="space-y-1">
            {items.map((row) => (
              <li key={row.id}>
                <Link
                  to={`/consultation/${row.id}`}
                  className="group flex flex-col gap-0.5 rounded-lg border border-transparent p-3 transition-colors duration-150 hover:border-border/50 hover:bg-muted/60"
                >
                  <span className="text-sm font-medium">
                    {getPatientFullName(row.patient)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {humanizeUiLabel(row.status)}
                    {row.type ? ` · ${humanizeUiLabel(row.type)}` : ""} ·{" "}
                    {formatDistanceToNow(row.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
