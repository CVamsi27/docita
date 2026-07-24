"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/card";
import { TabsContent } from "@workspace/ui/components/navigation/tabs";
import { ExternalLink } from "lucide-react";
import { buildPrometheusMetricsUrl } from "./system-monitoring-helpers";

/**
 * Phase 3 (per-feature): apps/internal System Monitoring > ops tab.
 * 5 literals converted to useTranslations("SystemMonitoring.OpsTab").
 */
function useOpsTabTranslations() {
  return useTranslations("SystemMonitoring.OpsTab");
}

export function OpsTab() {
  const t = useOpsTabTranslations();
  const prometheusMetricsUrl = buildPrometheusMetricsUrl();

  return (
    <TabsContent value="ops" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("description", { envVar: "NEXT_PUBLIC_OPS_*" })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[var(--radius)] border border-border/70 p-4">
            <p className="text-sm font-medium">{t("prometheusLabel")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("prometheusDescription", { path: "/metrics" })}
            </p>
            {prometheusMetricsUrl ? (
              <a
                href={prometheusMetricsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {t("openMetricsLink")}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("setApiUrlHint", { envVar: "NEXT_PUBLIC_API_URL" })}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                labelKey: "prometheus",
                url: process.env.NEXT_PUBLIC_OPS_PROMETHEUS_URL,
              },
              {
                labelKey: "grafana",
                url: process.env.NEXT_PUBLIC_OPS_GRAFANA_URL,
              },
              {
                labelKey: "flyDashboard",
                url: process.env.NEXT_PUBLIC_OPS_FLY_DASHBOARD_URL,
              },
              {
                labelKey: "sentry",
                url: process.env.NEXT_PUBLIC_OPS_SENTRY_URL,
              },
            ].map((item) => (
              <div
                key={item.labelKey}
                className="rounded-[var(--radius)] border border-border/70 p-4"
              >
                <p className="text-sm font-medium">
                  {t(`links.${item.labelKey}`)}
                </p>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline break-all"
                  >
                    {item.url}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("notConfiguredHint")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
