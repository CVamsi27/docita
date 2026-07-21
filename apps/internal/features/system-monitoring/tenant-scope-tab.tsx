"use client";

import { sanitizeUserFacingMessage } from "@workspace/utils";
import {
  Card,
  CardContent,
  TabsContent
} from "@workspace/ui/components";
import { ShieldAlert } from "lucide-react";
import type { SystemMonitoringPageViewModel } from "./use-system-monitoring-page";
import { TenantScopeMetricsCards } from "./tenant-scope-metrics-cards";
import { TenantScopeRulesTable } from "./tenant-scope-rules-table";
import { TenantScopeCoverage } from "./tenant-scope-coverage";

export type TenantScopeTabProps = Pick<
  SystemMonitoringPageViewModel,
  | "tenantScope"
  | "tenantScopeQuery"
  | "tenantScopeIssueCount"
  | "tenantScopeStatus"
  | "getStatusBadge"
>;

export function TenantScopeTab({
  tenantScope,
  tenantScopeQuery,
  tenantScopeIssueCount,
  tenantScopeStatus,
  getStatusBadge,
}: TenantScopeTabProps) {
  return (
    <TabsContent value="tenant-scope" className="flex flex-col gap-6">
      <TenantScopeMetricsCards
        scopedModels={tenantScope?.scopedModels}
        directScopedModels={tenantScope?.directScopedModels}
        relationScopedModels={tenantScope?.relationScopedModels}
        issueCount={tenantScopeIssueCount}
        clinicIdModels={tenantScope?.clinicIdModels ?? 0}
      />

      {tenantScopeQuery.isError ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldAlert className="h-4 w-4" />
              {sanitizeUserFacingMessage(
                tenantScopeQuery.error instanceof Error
                  ? tenantScopeQuery.error.message
                  : "Tenant diagnostics did not load",
                "Tenant diagnostics did not load",
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <TenantScopeRulesTable
            rules={tenantScope?.rules ?? []}
            statusBadge={getStatusBadge(tenantScopeStatus)}
            statusLabel="Schema-backed coverage from the API Prisma extension"
          />
          <TenantScopeCoverage
            uncoveredCount={tenantScope?.uncoveredClinicIdModels.length ?? 0}
            staleCount={tenantScope?.staleRelationRules.length ?? 0}
            excludedCount={tenantScope?.excludedClinicIdModels.length ?? 0}
            excludedModels={tenantScope?.excludedClinicIdModels ?? []}
          />
        </div>
      )}
    </TabsContent>
  );
}
