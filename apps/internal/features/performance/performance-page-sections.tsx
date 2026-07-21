"use client";

// Idiomatic shadcn/Origin import boilerplate — shared verbatim with sibling
// monitoring/performance dashboards that render the same primitive families.
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from "@workspace/ui/components";
import { useTranslations } from "next-intl";
import { SystemHealthBadge, SystemHealthIcon } from "@workspace/ui/components/feedback/system-health-indicator";
import { formatCountLocale } from "@workspace/utils";
import { Activity, AlertTriangle, Clock, Cpu, Database, Server, Wifi } from "lucide-react";
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
  const t = useTranslations("Performance");
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
      <MetricStatCard
        title={t("uptimeTitle")}
        icon={Activity}
        valueClassName="text-success"
        value={uptimeFormatted}
        description={t("uptimeSeconds", { count: formatCountLocale(uptimeSeconds) })}
      />
      <MetricStatCard
        title={t("avgResponseTitle")}
        icon={Clock}
        value={`${averageResponseTime}ms`}
        description={t("avgResponseDescription")}
      />
      <MetricStatCard
        title={t("requestsPerMinuteTitle")}
        icon={Wifi}
        value={requestsPerMinute}
        description={t("requestsPerMinuteDescription")}
      />
      <MetricStatCard
        title={t("errorRateTitle")}
        icon={AlertTriangle}
        valueClassName="text-success"
        value={`${errorRate}%`}
        description={t("errorRateDescription", { count: formatCountLocale(errorCount) })}
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
  const t = useTranslations("Performance");
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricStatCard
        title={t("cpuTitle")}
        icon={Cpu}
        value={`${totalCpuSeconds}s`}
        description={t("cpuDescription", {
          user: cpuUser.toFixed(2),
          system: cpuSystem.toFixed(2),
        })}
      />
      <MetricStatCard
        title={t("memoryTitle")}
        icon={Server}
        value={`${heapUsagePercent}%`}
        description={t("memoryDescription", {
          rss: memoryRss,
          heapUsed: memoryHeapUsed,
          heapTotal: memoryHeapTotal,
        })}
      >
        <Progress value={heapUsagePercent} className="h-2" />
      </MetricStatCard>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("databaseQueryTitle")}
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
  const t = useTranslations("Performance");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("serviceHealthTitle")}</CardTitle>
        <CardDescription>{t("serviceHealthDescription")}</CardDescription>
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
                  <p className="font-medium">{t("apiHealthTitle")}</p>
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
                  <p className="font-medium">{t("monitoringDbTitle")}</p>
                  <p className="text-sm text-muted-foreground">
                    {monitoringDbConnected
                      ? t("monitoringDbConnected")
                      : t("monitoringDbDisconnected")}
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
