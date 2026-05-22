"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/navigation/tabs";
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

export function SystemMonitoringTabs({ vm }: SystemMonitoringTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        <TabsTrigger value="experience">Experience</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="queues">Queues</TabsTrigger>
        <TabsTrigger value="ops">Ops</TabsTrigger>
        <TabsTrigger value="tenant-scope">Tenant Scope</TabsTrigger>
        <TabsTrigger value="health">Health Checks</TabsTrigger>
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
