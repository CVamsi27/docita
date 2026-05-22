"use client";

import { DATE_FORMATS, formatDate } from "@workspace/utils";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Progress } from "@workspace/ui/components/feedback/progress";
import { TabsContent } from "@workspace/ui/components/navigation/tabs";
import {
  Activity,
  Database,
  Server,
  Wifi,
} from "lucide-react";
import { formatBytesToMb } from "./system-monitoring-helpers";
import type { SystemMonitoringPageViewModel } from "./use-system-monitoring-page";

export type PerformanceTabProps = Pick<
  SystemMonitoringPageViewModel,
  | "performance"
  | "monitoringHealth"
  | "database"
  | "heapUsagePercent"
  | "slowestEndpoints"
  | "throughputByMinute"
  | "maxThroughputCount"
  | "responseBuckets"
>;

export function PerformanceTab({
  performance,
  monitoringHealth,
  database,
  heapUsagePercent,
  slowestEndpoints,
  throughputByMinute,
  maxThroughputCount,
  responseBuckets,
}: PerformanceTabProps) {
  return (
    <TabsContent value="performance" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
              {performance?.uptime.formatted ?? "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Process uptime from the runtime API
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Node Runtime</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {performance?.node.version ?? "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {performance
                ? `${performance.node.platform} / ${performance.node.arch}`
                : "Waiting for runtime metrics"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Requests per minute
            </CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {monitoringHealth
                ? (monitoringHealth.requestsLastHour / 60).toFixed(2)
                : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Derived from live request volume
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Database Status
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {database?.status ?? "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {database
                ? `${database.queryResponseTimeMs}ms query time`
                : "Waiting for database stats"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Memory Breakdown</CardTitle>
            <CardDescription>Live Node process memory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>RSS</span>
                <span>
                  {performance
                    ? formatBytesToMb(performance.memory.rss)
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Heap used</span>
                <span>
                  {performance
                    ? formatBytesToMb(performance.memory.heapUsed)
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Heap total</span>
                <span>
                  {performance
                    ? formatBytesToMb(performance.memory.heapTotal)
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>External</span>
                <span>
                  {performance
                    ? formatBytesToMb(performance.memory.external)
                    : "N/A"}
                </span>
              </div>
            </div>
            <Progress value={heapUsagePercent} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Slowest Endpoints</CardTitle>
            <CardDescription>
              Highest average duration over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {slowestEndpoints.slice(0, 5).map((endpoint) => (
                <div
                  key={`${endpoint.method}-${endpoint.path}`}
                  className="rounded-[var(--radius)] border border-border/70 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">
                      {endpoint.method} {endpoint.path}
                    </p>
                    <Badge variant="outline">
                      {endpoint.avgDuration.toFixed(2)}ms
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {endpoint.count} requests, max{" "}
                    {endpoint.maxDuration.toFixed(2)}ms
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Throughput</CardTitle>
            <CardDescription>Requests observed per minute</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {throughputByMinute.slice(-12).map((bucket) => (
                <div key={bucket.minute} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {formatDate(
                        new Date(`${bucket.minute}:00Z`),
                        DATE_FORMATS.TIME_SHORT,
                        { timezone: "UTC" },
                      )}
                    </span>
                    <span>{bucket.count}</span>
                  </div>
                  <Progress
                    value={
                      maxThroughputCount > 0
                        ? Math.round(
                            (bucket.count / maxThroughputCount) * 100,
                          )
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Response Time Distribution</CardTitle>
          <CardDescription>
            Request latency buckets from live API request logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-7">
            {responseBuckets.map((bucket) => (
              <div
                key={bucket.range}
                className="rounded-[var(--radius)] border border-border/70 p-3 text-center"
              >
                <p className="text-xs text-muted-foreground">{bucket.range}</p>
                <p className="mt-2 text-[var(--fs-xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {bucket.count}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
