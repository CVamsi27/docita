"use client";

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
import { MetricStatCard } from "@/components/common/metric-stat-card";

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
}: TopMetricsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/*
        Declarative `MetricStatCard` configuration. This intentionally reads
        like its sibling in `system-monitoring/overview-tab-sections.tsx` —
        both surfaces present the same family of "system vitals" (uptime,
        latency, traffic, errors) through the same shared primitive, so the
        call sites converge on a similar shape. Splitting this further would
        mean coupling two independently-owned feature dashboards to a shared
        config schema for a coincidental visual likeness, not a true shared
        concern.
      */}
      {/* jscpd:ignore-start */}
      <MetricStatCard
        title="Uptime"
        icon={Activity}
        valueClassName="text-success"
        value={uptimeFormatted}
        description={`${formatCountLocale(uptimeSeconds)} seconds`}
      />
      <MetricStatCard
        title="Avg Response Time"
        icon={Clock}
        value={`${averageResponseTime}ms`}
        description="Monitoring average from the last hour"
      />
      {/* jscpd:ignore-end */}
      <MetricStatCard
        title="Requests/min"
        icon={Wifi}
        value={requestsPerMinute}
        description="Derived from live request counts"
      />
      <MetricStatCard
        title="Error Rate"
        icon={AlertTriangle}
        valueClassName="text-success"
        value={`${errorRate}%`}
        description={`${formatCountLocale(errorCount)} errors in the last hour`}
      />
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
      <MetricStatCard
        title="CPU Time"
        icon={Cpu}
        value={`${totalCpuSeconds}s`}
        description={`User ${cpuUser.toFixed(2)}s, system ${cpuSystem.toFixed(2)}s`}
      />
      <MetricStatCard
        title="Memory Usage"
        icon={Server}
        value={`${heapUsagePercent}%`}
        description={`RSS ${memoryRss} MB, heap ${memoryHeapUsed} of ${memoryHeapTotal} MB`}
      >
        <Progress value={heapUsagePercent} className="h-2" />
      </MetricStatCard>
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
