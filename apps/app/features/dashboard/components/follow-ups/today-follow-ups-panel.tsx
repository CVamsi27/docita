"use client";

import { getPatientFullName } from "@workspace/utils";
import Link from "next/link";
import { formatDate } from "@/lib/formatters";
import {
  FOLLOW_UP_STATUS_LABELS as STATUS_LABELS,
  getFollowUpListQuery,
} from "@/features/follow-ups";
import { useFollowUps } from "@workspace/data-access";
import type { FollowUpResponse } from "@workspace/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { CalendarCheck } from "lucide-react";
import { ViewAllLinkUI } from "@/features/dashboard/components/layout/view-all-link-ui";

function patientName(followUp: FollowUpResponse) {
  const firstName = followUp.patient?.firstName ?? "";
  const lastName = followUp.patient?.lastName ?? "";
  return getPatientFullName({ firstName, lastName }, "Patient");
}

interface TodayFollowUpsPanelProps {
  enabled: boolean;
}

export function TodayFollowUpsPanel({ enabled }: TodayFollowUpsPanelProps) {
  const query = getFollowUpListQuery("today");
  const {
    data = [],
    isLoading,
    isError,
  } = useFollowUps(enabled ? query : null);

  if (!enabled) return null;

  const preview = data.slice(0, 5);

  return (
    <Card className="border border-border shadow-sm bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-warning">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-[var(--fs-base)]">
                Follow-ups due today
              </CardTitle>
              <CardDescription className="text-xs">
                Callbacks and planned reviews for today
              </CardDescription>
            </div>
          </div>
          <div className="shrink-0">
            <ViewAllLinkUI href="/follow-ups" text="Follow-ups" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading follow-ups…
          </p>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            We could not load follow-ups. Open the follow-ups page to retry.
          </p>
        ) : preview.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No follow-ups due today"
            description="You are caught up for today."
            className="py-5"
          />
        ) : (
          <ul className="space-y-1">
            {preview.map((fu) => (
              <li key={fu.id}>
                <Link
                  href={`/patients/${fu.patientId}`}
                  className="group flex flex-col gap-1 rounded-lg border border-transparent p-3 transition-colors duration-150 hover:border-border/50 hover:bg-muted/60"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {patientName(fu)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {STATUS_LABELS[fu.status]}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {fu.reason}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Due {formatDate(fu.scheduledDate)}
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
