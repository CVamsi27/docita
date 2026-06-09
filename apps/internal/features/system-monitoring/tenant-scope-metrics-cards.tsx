"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";

interface TenantScopeMetricsCardsProps {
  scopedModels?: number;
  directScopedModels?: number;
  relationScopedModels?: number;
  issueCount: number;
  clinicIdModels: number;
}

export function TenantScopeMetricsCards({
  scopedModels,
  directScopedModels,
  relationScopedModels,
  issueCount,
  clinicIdModels,
}: TenantScopeMetricsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Scoped</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {scopedModels ?? "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">
            {clinicIdModels ?? 0} models carry clinicId
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Direct</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {directScopedModels ?? "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">Scalar clinicId filters</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Relation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {relationScopedModels ?? "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">Nested tenant filters</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {issueCount}
          </div>
          <p className="text-xs text-muted-foreground">
            Uncovered models or stale rules
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
