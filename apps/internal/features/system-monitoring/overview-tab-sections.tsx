"use client";

import { formatCountLocale } from "@workspace/utils";
// Idiomatic shadcn/Origin import boilerplate — shared verbatim with sibling
// monitoring/performance dashboards that render the same primitive families.
// jscpd:ignore-start
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Progress } from "@workspace/ui/components/feedback/progress";
// jscpd:ignore-end
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
import { MetricStatCard } from "@/components/common/metric-stat-card";
import { formatBytesToMb } from "./system-monitoring-helpers";
import type { SystemMonitoringPageViewModel } from "./use-system-monitoring-page";

type OverviewTrafficStatsProps = Pick<
  SystemMonitoringPageViewModel,
  "performance" | "liveResponseTime" | "requestsLastHour" | "errorsLastHour" | "errorRate"
>;

/** Uptime / response-time / traffic / error-rate stat cards. */
export function OverviewTrafficStats({
  performance,
  liveResponseTime,
  requestsLastHour,
  errorsLastHour,
  errorRate,
}: OverviewTrafficStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricStatCard
        title="Uptime"
        icon={Activity}
        valueClassName="text-success"
        value={performance ? performance.uptime.formatted : "N/A"}
        description={
          performance
            ? `${formatCountLocale(performance.uptime.seconds)} seconds`
            : "Waiting for live metrics"
        }
      />
      <MetricStatCard
        title="Avg Response Time"
        icon={Clock}
        value={`${liveResponseTime.toFixed(2)}ms`}
        description="Last hour average from the monitoring pipeline"
      />
      <MetricStatCard
        title="Requests last hour"
        icon={Wifi}
        value={formatCountLocale(requestsLastHour)}
        description="Live traffic observed in the last 60 minutes"
      />
      <MetricStatCard
        title="Error Rate"
        icon={AlertTriangle}
        valueClassName="text-success"
        value={`${errorRate}%`}
        description={`${formatCountLocale(errorsLastHour)} errors in the last hour`}
      />
    </div>
  );
}

type OverviewResourceStatsProps = Pick<
  SystemMonitoringPageViewModel,
  | "performance"
  | "monitoringHealth"
  | "heapUsagePercent"
  | "database"
  | "tenantScope"
  | "tenantScopeStatus"
  | "tenantScopeIssueCount"
  | "getStatusBadge"
>;

/** Heap usage / CPU time / database query / tenant coverage stat cards. */
export function OverviewResourceStats({
  performance,
  monitoringHealth,
  heapUsagePercent,
  database,
  tenantScope,
  tenantScopeStatus,
  tenantScopeIssueCount,
  getStatusBadge,
}: OverviewResourceStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricStatCard
        title="Heap Usage"
        icon={Server}
        value={`${heapUsagePercent}%`}
        description={
          performance
            ? `${formatBytesToMb(performance.memory.heapUsed)} used of ${formatBytesToMb(performance.memory.heapTotal)}`
            : "Waiting for memory metrics"
        }
      >
        <Progress value={heapUsagePercent} className="h-2" />
      </MetricStatCard>
      <MetricStatCard
        title="CPU Time"
        icon={Cpu}
        value={
          monitoringHealth
            ? `${(monitoringHealth.cpuUsage.user + monitoringHealth.cpuUsage.system).toFixed(2)}s`
            : "N/A"
        }
        description={`User ${monitoringHealth?.cpuUsage.user.toFixed(2) ?? "0.00"}s, system ${monitoringHealth?.cpuUsage.system.toFixed(2) ?? "0.00"}s`}
      />
      <MetricStatCard
        title="Database Query"
        icon={Database}
        value={database ? `${database.queryResponseTimeMs}ms` : "N/A"}
        description={database?.status ?? "Waiting for database metrics"}
      />
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
  );
}

type OverviewLiveSystemSummaryProps = Pick<
  SystemMonitoringPageViewModel,
  "healthSummary" | "getStatusIcon" | "getStatusBadge"
>;

/** Combined status card summarizing monitoring, app health, and database checks. */
export function OverviewLiveSystemSummary({
  healthSummary,
  getStatusIcon,
  getStatusBadge,
}: OverviewLiveSystemSummaryProps) {
  return (
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
  );
}
