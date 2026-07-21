"use client";

import { useTranslations } from "next-intl";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@workspace/ui/components";

interface TenantScopeCoverageProps {
  uncoveredCount: number;
  staleCount: number;
  excludedCount: number;
  excludedModels: string[];
}

/**
 * Phase 3 (per-feature): apps/internal System Monitoring > tenant scope coverage.
 * 5 literals converted to useTranslations("SystemMonitoring.TenantScopeCoverage").
 */
function useTenantScopeCoverageTranslations() {
  return useTranslations("SystemMonitoring.TenantScopeCoverage");
}

export function TenantScopeCoverage({ uncoveredCount, staleCount, excludedCount, excludedModels }: TenantScopeCoverageProps) {
  const t = useTenantScopeCoverageTranslations();
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("coverageTitle")}</CardTitle>
          <CardDescription>
            {t("coverageSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <span className="text-sm font-medium">{t("uncoveredLabel")}</span>
            <Badge
              variant={uncoveredCount ? "destructive" : "secondary"}
            >
              {uncoveredCount}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <span className="text-sm font-medium">{t("staleRulesLabel")}</span>
            <Badge
              variant={staleCount ? "destructive" : "secondary"}
            >
              {staleCount}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <span className="text-sm font-medium">{t("excludedLabel")}</span>
            <Badge variant="outline">{excludedCount}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("exceptionsTitle")}</CardTitle>
          <CardDescription>
            {t("exceptionsSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {excludedModels.map((model) => (
              <Badge key={model} variant="outline">
                {model}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
