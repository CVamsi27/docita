"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, RotateCcw } from "lucide-react";
import { useQueue, useResetQueue } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  isQueueTokenCompleted,
  isQueueTokenInProgress,
  isQueueTokenWaiting,
} from "@/lib/utils/queue-token-status";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { ConfirmationDialog } from "@workspace/ui/components/overlay/confirmation-dialog";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

export const QueueLiveStatusPanel = () => {
  const {
    data: queue,
    isLoading: queueLoading,
    isRefetching,
    refetch,
  } = useQueue();
  const { mutateAsync: resetQueueAsync, isPending: isResetting } =
    useResetQueue();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const stats = useMemo(() => {
    const items = queue ?? [];
    const waiting = items.filter((item) =>
      isQueueTokenWaiting(item.status),
    ).length;
    const called = items.filter((item) =>
      isQueueTokenInProgress(item.status),
    ).length;
    const completed = items.filter((item) =>
      isQueueTokenCompleted(item.status),
    ).length;
    const avgWait =
      items.length > 0
        ? Math.round(
            items.reduce(
              (total, item) => total + (item.estimatedWaitTime ?? 0),
              0,
            ) / items.length,
          )
        : 0;

    return { total: items.length, waiting, called, completed, avgWait };
  }, [queue]);

  return (
    <>
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle>Live queue status</CardTitle>
          <CardDescription>
            Monitor and control today&apos;s patient queue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-5">
          {queueLoading ? (
            <div
              className="flex flex-col gap-4 py-6"
              role="status"
              aria-live="polite"
              aria-label="Loading queue statistics"
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-10 w-48" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <StatTile label="Total" value={stats.total} />
                <StatTile label="Waiting" value={stats.waiting} />
                <StatTile label="In consultation" value={stats.called} />
                <StatTile label="Completed" value={stats.completed} />
                <StatTile label="Avg wait" value={`${stats.avgWait}m`} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Live queue status</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => void refetch()}
                  disabled={isRefetching}
                >
                  {isRefetching ? (
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  type="button"
                  onClick={() => setResetDialogOpen(true)}
                  disabled={isResetting || stats.total === 0}
                >
                  {isResetting ? (
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Reset Today&apos;s Queue
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Use reset only when queue order needs a hard restart for the
                day.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="Reset today's queue?"
        description="This will clear the current queue order for today."
        confirmText="Reset queue"
        type="warning"
        isLoading={isResetting}
        onConfirm={async () => {
          try {
            await resetQueueAsync(undefined);
            toast.success("Queue reset successfully");
            void refetch();
          } catch (error) {
            showUserFacingErrorToast(
              error,
              "We could not reset today's queue. Please try again.",
              "save",
            );
          }
        }}
      />
    </>
  );
};

const StatTile = ({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) => (
  <div className="rounded-lg border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-[var(--fs-xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
      {value}
    </p>
  </div>
);
