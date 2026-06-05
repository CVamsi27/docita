"use client";

import { TabsContent } from "@workspace/ui/components/navigation/tabs";
import type { SystemMonitoringPageViewModel } from "./use-system-monitoring-page";
import {
  MemoryBreakdownCard,
  ResponseTimeDistributionCard,
  SlowestEndpointsCard,
  StatCardGrid,
  ThroughputCard,
} from "./performance-tab-sections";

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
      <StatCardGrid
        performance={performance}
        monitoringHealth={monitoringHealth}
        database={database}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MemoryBreakdownCard
          performance={performance}
          heapUsagePercent={heapUsagePercent}
        />
        <SlowestEndpointsCard slowestEndpoints={slowestEndpoints} />
        <ThroughputCard
          throughputByMinute={throughputByMinute}
          maxThroughputCount={maxThroughputCount}
        />
      </div>

      <ResponseTimeDistributionCard responseBuckets={responseBuckets} />
    </TabsContent>
  );
}
