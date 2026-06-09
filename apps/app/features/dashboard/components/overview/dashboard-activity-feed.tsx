"use client";

// jscpd:ignore-start
import Link from "next/link";
import { Activity } from "lucide-react";
import type { DashboardStats } from "@workspace/types";
import { formatDistanceToNow, getPatientFullName } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { ViewAllLinkUI } from "@/features/dashboard/components/layout/view-all-link-ui";

interface DashboardActivityFeedProps {
// jscpd:ignore-end
  items: DashboardStats["recentActivity"];
}

export function DashboardActivityFeed({ items }: DashboardActivityFeedProps) {
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
                Recent activity
              </CardTitle>
              <CardDescription className="text-xs">
                Latest appointment updates
              </CardDescription>
            </div>
          </div>
          <ViewAllLinkUI href="/appointments" text="Appointments" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recent activity"
            description="New visits and updates will appear here."
          />
        ) : (
          <ul className="space-y-1">
            {items.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/consultation/${row.id}`}
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
