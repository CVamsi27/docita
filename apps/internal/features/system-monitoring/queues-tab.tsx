"use client";

import { formatCountLocale } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataState,
  TabsContent
} from "@workspace/ui/components";
import type { SystemMonitoringPageViewModel } from "./use-system-monitoring-page";

export type QueuesTabProps = Pick<
  SystemMonitoringPageViewModel,
  "queueHealthQuery"
>;

function QueueTopCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; count: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>By job name</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">None</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((row) => (
              <li key={row.name} className="flex justify-between gap-2">
                <span className="truncate font-mono text-xs">{row.name}</span>
                <span className="tabular-nums">
                  {formatCountLocale(row.count)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function QueuesTab({ queueHealthQuery }: QueuesTabProps) {
  return (
    <TabsContent value="queues" className="space-y-6">
      <DataState
        status={
          queueHealthQuery.isLoading
            ? "loading"
            : queueHealthQuery.isError
              ? "error"
              : "success"
        }
        loadingMessage="Loading queue health…"
        errorMessage={
          queueHealthQuery.error instanceof Error
            ? queueHealthQuery.error.message
            : "Could not load queue health."
        }
        onRetry={() => void queueHealthQuery.refetch()}
      >
        {queueHealthQuery.data ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Background queue snapshot</CardTitle>
                <CardDescription>
                  Live counts from the{" "}
                  <span className="font-mono text-xs">QueueJob</span> table.
                  Worker Prometheus histograms run in the worker process; scrape
                  them separately if you expose a metrics port on Fly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {queueHealthQuery.data.countsByStatus.map((row) => (
                    <div
                      key={row.status}
                      className="rounded-[var(--radius)] border border-border/70 p-3"
                    >
                      <p className="text-xs text-muted-foreground">
                        {row.status}
                      </p>
                      <p className="text-[var(--fs-xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                        {formatCountLocale(row.count)}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Dead-lettered (last 24h):{" "}
                  <span className="font-medium text-foreground">
                    {formatCountLocale(
                      queueHealthQuery.data.deadLetteredLast24h,
                    )}
                  </span>
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <QueueTopCard
                title="Top waiting queues"
                rows={queueHealthQuery.data.topQueuesByWaiting}
              />
              <QueueTopCard
                title="Top failed queues"
                rows={queueHealthQuery.data.topQueuesByFailed}
              />
            </div>
          </>
        ) : null}
      </DataState>
    </TabsContent>
  );
}
