"use client";

import { useMemo } from "react";
import { useQueue, useResetQueue } from "@/hooks/api/use-appointments";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Loader2, RefreshCw, RotateCcw } from "lucide-react";

export const QueueSettings = () => {
  const { data: queue, isLoading, isRefetching, refetch } = useQueue();
  const { mutate: resetQueue, isPending: isResetting } = useResetQueue();

  const stats = useMemo(() => {
    const items = queue ?? [];
    const waiting = items.filter((item) => item.status === "waiting").length;
    const called = items.filter((item) => item.status === "called").length;
    const completed = items.filter(
      (item) => item.status === "completed",
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

    return {
      total: items.length,
      waiting,
      called,
      completed,
      avgWait,
    };
  }, [queue]);

  const handleResetQueue = () => {
    const confirmed = window.confirm(
      "Reset today’s queue? This will clear the current queue order.",
    );
    if (!confirmed) return;

    resetQueue(undefined, {
      onSuccess: () => {
        toast.success("Queue reset successfully");
        void refetch();
      },
      onError: (error) => {
        toast.error(`Failed to reset queue: ${error.message}`);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue Settings</CardTitle>
        <CardDescription>
          Monitor and control today&apos;s patient queue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-semibold">{stats.total}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Waiting</p>
                <p className="text-xl font-semibold">{stats.waiting}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Called</p>
                <p className="text-xl font-semibold">{stats.called}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-xl font-semibold">{stats.completed}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Avg wait</p>
                <p className="text-xl font-semibold">{stats.avgWait}m</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Live queue status</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                disabled={isRefetching}
              >
                {isRefetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleResetQueue}
                disabled={isResetting || stats.total === 0}
              >
                {isResetting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Reset Today&apos;s Queue
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Use reset only when queue order needs a hard restart for the day.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
