"use client";

import { sanitizeUserFacingMessage } from "@workspace/utils";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { TabsContent } from "@workspace/ui/components/navigation/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { ShieldAlert } from "lucide-react";
import type { SystemMonitoringPageViewModel } from "./use-system-monitoring-page";

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scoped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {tenantScope?.scopedModels ?? "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {tenantScope?.clinicIdModels ?? 0} models carry clinicId
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Direct</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {tenantScope?.directScopedModels ?? "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Scalar clinicId filters
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Relation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {tenantScope?.relationScopedModels ?? "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Nested tenant filters
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {tenantScopeIssueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Uncovered models or stale rules
            </p>
          </CardContent>
        </Card>
      </div>

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
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Tenant Scope Rules</CardTitle>
                  <CardDescription>
                    Schema-backed coverage from the API Prisma extension
                  </CardDescription>
                </div>
                {getStatusBadge(tenantScopeStatus)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[520px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Path</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tenantScope?.rules ?? []).map((rule) => (
                      <TableRow key={rule.model}>
                        <TableCell className="font-medium">
                          {rule.model}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              rule.kind === "direct" ? "secondary" : "outline"
                            }
                          >
                            {rule.kind}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {rule.path?.join(" -> ") ?? "clinicId"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Coverage Status</CardTitle>
                <CardDescription>
                  Open tenant-scope findings from the generated datamodel
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <span className="text-sm font-medium">Uncovered</span>
                  <Badge
                    variant={
                      tenantScope?.uncoveredClinicIdModels.length
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {tenantScope?.uncoveredClinicIdModels.length ?? 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <span className="text-sm font-medium">Stale rules</span>
                  <Badge
                    variant={
                      tenantScope?.staleRelationRules.length
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {tenantScope?.staleRelationRules.length ?? 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <span className="text-sm font-medium">Excluded</span>
                  <Badge variant="outline">
                    {tenantScope?.excludedClinicIdModels.length ?? 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exceptions</CardTitle>
                <CardDescription>
                  ClinicId models intentionally outside auto-scoping
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(tenantScope?.excludedClinicIdModels ?? []).map((model) => (
                    <Badge key={model} variant="outline">
                      {model}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </TabsContent>
  );
}
