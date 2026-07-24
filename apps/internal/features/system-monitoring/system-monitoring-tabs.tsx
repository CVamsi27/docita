"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/navigation/tabs";
import { useTranslations } from "next-intl";
import { ExperienceTab } from "./experience-tab";
import { HealthTab } from "./health-tab";
import { OpsTab } from "./ops-tab";
import { OverviewTab } from "./overview-tab";
import { PerformanceTab } from "./performance-tab";
import { QueuesTab } from "./queues-tab";
import { SecurityTab } from "./security-tab";
import { TenantScopeTab } from "./tenant-scope-tab";
import type { SystemMonitoringPageViewModel } from "./use-system-monitoring-page";

export type SystemMonitoringTabsProps = {
  vm: SystemMonitoringPageViewModel;
};

/**
 * Phase 3 (per-feature): apps/internal System monitoring > Tabs
 * (8 tab triggers). 8 literals converted to
 * useTranslations("InternalSystemMonitoring.tabs").
 */
function useMonitoringTabsTranslations() {
  return useTranslations("InternalSystemMonitoring.tabs");
}

export function SystemMonitoringTabs({ vm }: SystemMonitoringTabsProps) {
  const t = useMonitoringTabsTranslations();
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
        <TabsTrigger value="performance">{t("performance")}</TabsTrigger>
        <TabsTrigger value="experience">{t("experience")}</TabsTrigger>
        <TabsTrigger value="security">{t("security")}</TabsTrigger>
        <TabsTrigger value="queues">{t("queues")}</TabsTrigger>
        <TabsTrigger value="ops">{t("ops")}</TabsTrigger>
        <TabsTrigger value="tenant-scope">{t("tenantScope")}</TabsTrigger>
        <TabsTrigger value="health">{t("healthChecks")}</TabsTrigger>
      </TabsList>

      <OverviewTab
        performance={vm.performance}
        monitoringHealth={vm.monitoringHealth}
        liveResponseTime={vm.liveResponseTime}
        requestsLastHour={vm.requestsLastHour}
        errorsLastHour={vm.errorsLastHour}
        errorRate={vm.errorRate}
        heapUsagePercent={vm.heapUsagePercent}
        database={vm.database}
        tenantScope={vm.tenantScope}
        tenantScopeStatus={vm.tenantScopeStatus}
        tenantScopeIssueCount={vm.tenantScopeIssueCount}
        healthSummary={vm.healthSummary}
        getStatusIcon={vm.getStatusIcon}
        getStatusBadge={vm.getStatusBadge}
      />
      <PerformanceTab
        performance={vm.performance}
        monitoringHealth={vm.monitoringHealth}
        database={vm.database}
        heapUsagePercent={vm.heapUsagePercent}
        slowestEndpoints={vm.slowestEndpoints}
        throughputByMinute={vm.throughputByMinute}
        maxThroughputCount={vm.maxThroughputCount}
        responseBuckets={vm.responseBuckets}
      />
      <ExperienceTab webVitalsQuery={vm.webVitalsQuery} />
      <SecurityTab securitySummaryQuery={vm.securitySummaryQuery} />
      <QueuesTab queueHealthQuery={vm.queueHealthQuery} />
      <OpsTab />
      <TenantScopeTab
        tenantScope={vm.tenantScope}
        tenantScopeQuery={vm.tenantScopeQuery}
        tenantScopeIssueCount={vm.tenantScopeIssueCount}
        tenantScopeStatus={vm.tenantScopeStatus}
        getStatusBadge={vm.getStatusBadge}
      />
      <HealthTab
        appHealth={vm.appHealth}
        detailedChecks={vm.detailedChecks}
        getStatusIcon={vm.getStatusIcon}
        getStatusBadge={vm.getStatusBadge}
      />
    </Tabs>
  );
}
