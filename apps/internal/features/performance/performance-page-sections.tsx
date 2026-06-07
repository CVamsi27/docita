"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Progress } from "@workspace/ui/components/feedback/progress";
import {
  SystemHealthBadge,
  SystemHealthIcon,
} from "@workspace/ui/components/feedback/system-health-indicator";
import { formatCountLocale } from "@workspace/utils";
import {
  Activity,
  AlertTriangle,
  Clock,
  Cpu,
  Database,
  Server,
  Wifi,
} from "lucide-react";

interface TopMetricsCardsProps {
  uptimeFormatted: string;
  uptimeSeconds: number;
  requestsPerMinute: string;
  averageResponseTime: string;
  errorRate: string;
  errorCount: number;
}

export function TopMetricsCards({
  uptimeFormatted,
  uptimeSeconds,
  requestsPerMinute,
  averageResponseTime,
  errorRate,
  errorCount,
// jscpd:ignore-start
}: TopMetricsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
            {uptimeFormatted}
// jscpd:ignore-end
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCountLocale(uptimeSeconds)} seconds
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Avg Response Time
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{averageResponseTime}ms</div>
          <p className="text-xs text-muted-foreground">
            Monitoring average from the last hour
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Requests/min</CardTitle>
          <Wifi className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{requestsPerMinute}</div>
          <p className="text-xs text-muted-foreground">
            Derived from live request counts
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
            {errorRate}%
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCountLocale(errorCount)} errors in the last hour
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface MiddleMetricsCardsProps {
  totalCpuSeconds: string;
  cpuUser: number;
  cpuSystem: number;
  heapUsagePercent: number;
  memoryRss: number;
  memoryHeapUsed: number;
  memoryHeapTotal: number;
  databaseQueryResponseTimeMs: number;
  databaseStatus: string;
}

export function MiddleMetricsCards({
  totalCpuSeconds,
  cpuUser,
  cpuSystem,
  heapUsagePercent,
  memoryRss,
  memoryHeapUsed,
  memoryHeapTotal,
  databaseQueryResponseTimeMs,
  databaseStatus,
}: MiddleMetricsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CPU Time</CardTitle>
          <Cpu className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{totalCpuSeconds}s</div>
          <p className="text-xs text-muted-foreground">
            User {cpuUser.toFixed(2)}s, system{" "}
            {cpuSystem.toFixed(2)}s
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{heapUsagePercent}%</div>
          <Progress value={heapUsagePercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            RSS {memoryRss} MB, heap {memoryHeapUsed} of{" "}
            {memoryHeapTotal} MB
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Database Query Time
          </CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {databaseQueryResponseTimeMs}ms
          </div>
          <div className="flex items-center gap-2">
            <SystemHealthIcon size="sm" status={databaseStatus} />
            <SystemHealthBadge status={databaseStatus} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ServiceHealthSectionProps {
  appHealthStatus: string;
  monitoringDbConnected: boolean;
}

export function ServiceHealthSection({
  appHealthStatus,
  monitoringDbConnected,
}: ServiceHealthSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Health</CardTitle>
        <CardDescription>
          Status of the live API runtime and database connection
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[var(--radius)] border border-border/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <SystemHealthIcon
                  size="sm"
                  status={appHealthStatus}
                />
                <div>
                  <p className="font-medium">API Health</p>
                  <p className="text-sm text-muted-foreground">
                    {appHealthStatus}
                  </p>
                </div>
              </div>
              <SystemHealthBadge status={appHealthStatus} />
            </div>
          </div>
          <div className="rounded-[var(--radius)] border border-border/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <SystemHealthIcon
                  size="sm"
                  status={monitoringDbConnected ? "healthy" : "critical"}
                />
                <div>
                  <p className="font-medium">Monitoring DB</p>
                  <p className="text-sm text-muted-foreground">
                    {monitoringDbConnected ? "Connected" : "Disconnected"}
                  </p>
                </div>
              </div>
              <SystemHealthBadge
                status={monitoringDbConnected ? "healthy" : "critical"}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
