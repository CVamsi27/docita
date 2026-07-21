"use client";

import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "@workspace/utils";
import { Badge, Card, CardContent, CardHeader, CardTitle, DataState } from "@workspace/ui/components";
import { Megaphone } from "lucide-react";
import type { WhatsAppBroadcastJobSummary } from "@workspace/types";

const STATUS_VARIANTS: Record<
  WhatsAppBroadcastJobSummary["status"],
  "default" | "secondary" | "destructive"
> = {
  PENDING: "secondary",
  RUNNING: "default",
  COMPLETED: "secondary",
  FAILED: "destructive",
  CANCELLED: "secondary",
};

function broadcastStatusKey(status: string): string {
  switch (status) {
    case "PENDING":
      return "statusPending";
    case "RUNNING":
      return "statusRunning";
    case "COMPLETED":
      return "statusCompleted";
    case "FAILED":
      return "statusFailed";
    case "CANCELLED":
      return "statusCancelled";
    default:
      return status;
  }
}

interface BroadcastsListSectionProps {
  status: "loading" | "error" | "success";
  jobs: WhatsAppBroadcastJobSummary[];
  errorMessage?: string;
  onRetry: () => void;
}

export function BroadcastsListSection({
  status,
  jobs,
  errorMessage,
  onRetry,
}: BroadcastsListSectionProps) {
  const t = useTranslations("InternalBroadcasts.listSection");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent broadcasts</CardTitle>
      </CardHeader>
      <CardContent>
        <DataState
          status={
            status === "success" && jobs.length === 0 ? "empty" : status
          }
          loadingMessage="Loading broadcast history…"
          errorMessage={errorMessage}
          onRetry={onRetry}
          emptyTitle="No broadcasts yet"
          emptyDescription="Send your first campaign to see it here."
          emptyIcon={Megaphone}
        >
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="rounded-[var(--radius)] border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">{job.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {job.audienceLabel ?? "—"}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[job.status]}>
                    {t(broadcastStatusKey(job.status)) || job.status}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Sent {job.sentCount}/{job.totalCount}
                  </span>
                  {job.failedCount > 0 && (
                    <span className="text-destructive">
                      {job.failedCount} failed
                    </span>
                  )}
                  <span>{formatDistanceToNow(job.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </DataState>
      </CardContent>
    </Card>
  );
}
