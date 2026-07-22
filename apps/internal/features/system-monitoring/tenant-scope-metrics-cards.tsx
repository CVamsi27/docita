"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { useTranslations } from "next-intl";

interface TenantScopeMetricsCardsProps {
  scopedModels?: number;
  directScopedModels?: number;
  relationScopedModels?: number;
  issueCount: number;
  clinicIdModels: number;
}

/**
 * Phase 3 (per-feature): apps/internal System monitoring > Tenant
 * scope metrics cards. 6 literals converted to
 * useTranslations("InternalSystemMonitoring.tenantScopeMetricsCards").
 */
function useTenantScopeMetricsTranslations() {
  return useTranslations("InternalSystemMonitoring.tenantScopeMetricsCards");
}

export function TenantScopeMetricsCards({
  scopedModels,
  directScopedModels,
  relationScopedModels,
  issueCount,
  clinicIdModels,
}: TenantScopeMetricsCardsProps) {
  const t = useTenantScopeMetricsTranslations();
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t("scopedTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {scopedModels ?? "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("clinicIdHelper", { count: clinicIdModels ?? 0 })}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t("directTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {directScopedModels ?? "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">{t("directHelper")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t("relationTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {relationScopedModels ?? "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">{t("relationHelper")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t("issuesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {issueCount}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("issuesHelper")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
