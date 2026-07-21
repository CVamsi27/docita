"use client";

import { useTranslations } from "next-intl";
import { DATE_FORMATS, formatDate } from "@workspace/utils";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress
} from "@workspace/ui/components";
import {
  Activity,
  Database,
  Server,
  Wifi,
} from "lucide-react";
import { formatBytesToMb } from "./system-monitoring-helpers";

/**
 * Phase 3 (per-feature): apps/internal System Monitoring >
 * Performance tab. 12 literals converted to useTranslations
 * (\"InternalSystemMonitoring.performance\").
 */
function usePerformanceTranslations() {
  return useTranslations("InternalSystemMonitoring.performance");
}

export interface StatCardGridProps {
  performance?: {
    uptime: { formatted: string };
    node: { version: string; platform: string; arch: string };
  } | null;
  monitoringHealth?: { requestsLastHour: number } | null;
  database?: { status: string; queryResponseTimeMs: number } | null;
}

export function StatCardGrid({
  performance,
  monitoringHealth,
  database,
}: StatCardGridProps) {
  const t = usePerformanceTranslations();
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("uptimeTitle")}</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
            {performance?.uptime.formatted ?? "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("uptimeDescription")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("nodeRuntimeTitle")}</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {performance?.node.version ?? "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">
            {performance
              ? t("nodeRuntimeDetail", { platform: performance.node.platform, arch: performance.node.arch })
              : t("waitingForRuntime")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("requestsPerMinuteTitle")}
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
            {t("requestsPerMinuteDescription")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("databaseStatusTitle")}
          </CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {database?.status ?? "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">
            {database
              ? t("databaseStatusQueryTime", { ms: database.queryResponseTimeMs })
              : t("waitingForDatabase")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export interface MemoryBreakdownCardProps {
  performance?: {
    memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
  } | null;
  heapUsagePercent: number;
}

export function MemoryBreakdownCard({
  performance,
  heapUsagePercent,
}: MemoryBreakdownCardProps) {
  const t = usePerformanceTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("memoryTitle")}</CardTitle>
        <CardDescription>{t("memoryDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{t("memoryRss")}</span>
            <span>
              {performance
                ? formatBytesToMb(performance.memory.rss)
                : "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{t("memoryHeapUsed")}</span>
            <span>
              {performance
                ? formatBytesToMb(performance.memory.heapUsed)
                : "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{t("memoryHeapTotal")}</span>
            <span>
              {performance
                ? formatBytesToMb(performance.memory.heapTotal)
                : "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{t("memoryExternal")}</span>
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
  );
}

export interface SlowestEndpointsCardProps {
  slowestEndpoints: ReadonlyArray<{
    method: string;
    path: string;
    avgDuration: number;
    count: number;
    maxDuration: number;
  }>;
}

export function SlowestEndpointsCard({
  slowestEndpoints,
}: SlowestEndpointsCardProps) {
  const t = usePerformanceTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("slowestEndpointsTitle")}</CardTitle>
        <CardDescription>
          {t("slowestEndpointsDescription")}
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
                  {t("endpointAvgMs", { ms: endpoint.avgDuration.toFixed(2) })}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("endpointRequestStats", { count: endpoint.count, maxMs: endpoint.maxDuration.toFixed(2) })}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export interface ThroughputCardProps {
  throughputByMinute: ReadonlyArray<{ minute: string; count: number }>;
  maxThroughputCount: number;
}

export function ThroughputCard({
  throughputByMinute,
  maxThroughputCount,
}: ThroughputCardProps) {
  const t = usePerformanceTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("throughputTitle")}</CardTitle>
        <CardDescription>{t("throughputDescription")}</CardDescription>
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
  );
}

export interface ResponseTimeDistributionCardProps {
  responseBuckets: ReadonlyArray<{ range: string; count: number }>;
}

export function ResponseTimeDistributionCard({
  responseBuckets,
}: ResponseTimeDistributionCardProps) {
  const t = usePerformanceTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("responseDistributionTitle")}</CardTitle>
        <CardDescription>
          {t("responseDistributionDescription")}
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
  );
}
