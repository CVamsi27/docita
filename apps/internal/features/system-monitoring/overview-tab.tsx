"use client";

import { formatCountLocale } from "@workspace/utils";
// jscpd:ignore-start
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
// jscpd:ignore-end
import { Progress } from "@workspace/ui/components/feedback/progress";
import {
  TabsContent,
} from "@workspace/ui/components/navigation/tabs";
import {
  Activity,
  AlertTriangle,
  Clock,
  Cpu,
  Database,
  Server,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { formatBytesToMb } from "./system-monitoring-helpers";
import type { SystemMonitoringPageViewModel } from "./use-system-monitoring-page";

export type OverviewTabProps = Pick<
  SystemMonitoringPageViewModel,
  | "performance"
  | "monitoringHealth"
  | "liveResponseTime"
  | "requestsLastHour"
  | "errorsLastHour"
  | "errorRate"
  | "heapUsagePercent"
  | "database"
  | "tenantScope"
  | "tenantScopeStatus"
  | "tenantScopeIssueCount"
  | "healthSummary"
  | "getStatusIcon"
  | "getStatusBadge"
>;

export function OverviewTab({
  performance,
  monitoringHealth,
  liveResponseTime,
  requestsLastHour,
  errorsLastHour,
  errorRate,
  heapUsagePercent,
  database,
  tenantScope,
  tenantScopeStatus,
  tenantScopeIssueCount,
  healthSummary,
  getStatusIcon,
  getStatusBadge,
}: OverviewTabProps) {
  return (
    <TabsContent value="overview" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
              {performance ? performance.uptime.formatted : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {performance
                ? `${formatCountLocale(performance.uptime.seconds)} seconds`
                : "Waiting for live metrics"}
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
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {liveResponseTime.toFixed(2)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Last hour average from the monitoring pipeline
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Requests last hour
            </CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {formatCountLocale(requestsLastHour)}
            </div>
            <p className="text-xs text-muted-foreground">
              Live traffic observed in the last 60 minutes
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
              {formatCountLocale(errorsLastHour)} errors in the last hour
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Heap Usage</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {heapUsagePercent}%
            </div>
            <Progress value={heapUsagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {performance
                ? `${formatBytesToMb(performance.memory.heapUsed)} used of ${formatBytesToMb(performance.memory.heapTotal)}`
                : "Waiting for memory metrics"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Time</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {monitoringHealth
                ? `${(monitoringHealth.cpuUsage.user + monitoringHealth.cpuUsage.system).toFixed(2)}s`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              User {monitoringHealth?.cpuUsage.user.toFixed(2) ?? "0.00"}s,
              system {monitoringHealth?.cpuUsage.system.toFixed(2) ?? "0.00"}s
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Query</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {database ? `${database.queryResponseTimeMs}ms` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {database?.status ?? "Waiting for database metrics"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenant Coverage</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {tenantScope ? tenantScope.scopedModels : "N/A"}
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(tenantScopeStatus)}
              <span className="text-xs text-muted-foreground">
                {tenantScopeIssueCount} open issues
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live System Summary</CardTitle>
          <CardDescription>
            Combined status from monitoring, app health, and database checks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {healthSummary?.map((item) => (
              <div
                key={item.label}
                className="rounded-[var(--radius)] border border-border/70 p-4 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <p className="font-medium">{item.label}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.value}</p>
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
