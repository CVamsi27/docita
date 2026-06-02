"use client";

import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { formatDate, getPatientFullName } from "@workspace/utils";
import type { DashboardStats } from "@workspace/types";
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
import { filterUpcomingBeyondToday } from "@/features/dashboard/lib/upcoming-beyond-today";

interface DashboardUpcomingCardProps {
  upcoming: DashboardStats["upcomingAppointments"];
}

export function DashboardUpcomingCard({
  upcoming,
}: DashboardUpcomingCardProps) {
  const rows = filterUpcomingBeyondToday(upcoming).slice(0, 6);

  return (
    <Card className="border border-border shadow-sm bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/70 text-info">
              <CalendarRange className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-[var(--fs-base)]">
                Upcoming visits
              </CardTitle>
              <CardDescription className="text-xs">
                Scheduled from tomorrow onward
              </CardDescription>
            </div>
          </div>
          <ViewAllLinkUI href="/appointments" text="Calendar" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="No upcoming visits"
            description="Schedule appointments to see what is next for your clinic."
            action={{ label: "Schedule", href: "/appointments?action=new" }}
          />
        ) : (
          <ul className="space-y-1">
            {rows.map((apt) => (
              <li key={apt.id}>
                <Link
                  href={`/consultation/${apt.id}`}
                  className="group flex flex-col gap-0.5 rounded-lg border border-transparent p-3 transition-colors duration-150 hover:border-border/50 hover:bg-muted/60"
                >
                  <span className="text-sm font-medium">
                    {getPatientFullName(apt.patient)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(apt.startTime, "EEE MMM d '·' hh:mm a")} ·{" "}
                    {humanizeUiLabel(apt.status)}
                    {apt.type ? ` · ${humanizeUiLabel(apt.type)}` : ""}
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
