"use client";

import {
  TabsContent,
} from "@workspace/ui/components/navigation/tabs";
import { OverviewLiveSystemSummary, OverviewResourceStats, OverviewTrafficStats } from "./overview-tab-sections";
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
      <OverviewTrafficStats
        performance={performance}
        liveResponseTime={liveResponseTime}
        requestsLastHour={requestsLastHour}
        errorsLastHour={errorsLastHour}
        errorRate={errorRate}
      />

      <OverviewResourceStats
        performance={performance}
        monitoringHealth={monitoringHealth}
        heapUsagePercent={heapUsagePercent}
        database={database}
        tenantScope={tenantScope}
        tenantScopeStatus={tenantScopeStatus}
        tenantScopeIssueCount={tenantScopeIssueCount}
        getStatusBadge={getStatusBadge}
      />

      <OverviewLiveSystemSummary
        healthSummary={healthSummary}
        getStatusIcon={getStatusIcon}
        getStatusBadge={getStatusBadge}
      />
    </TabsContent>
  );
}
