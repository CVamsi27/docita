"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { TabsContent } from "@workspace/ui/components/navigation/tabs";
import { ExternalLink } from "lucide-react";
import { buildPrometheusMetricsUrl } from "./system-monitoring-helpers";

export function OpsTab() {
  const prometheusMetricsUrl = buildPrometheusMetricsUrl();

  return (
    <TabsContent value="ops" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Operations links</CardTitle>
          <CardDescription>
            Non-secret URLs only. Configure via{" "}
            <span className="font-mono text-xs">NEXT_PUBLIC_OPS_*</span>{" "}
            environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[var(--radius)] border border-border/70 p-4">
            <p className="text-sm font-medium">API Prometheus scrape</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The Nest API exposes unversioned metrics at{" "}
              <span className="font-mono">/metrics</span> on the API origin
              (protect at the edge in production).
            </p>
            {prometheusMetricsUrl ? (
              <a
                href={prometheusMetricsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Open metrics endpoint
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Set <span className="font-mono">NEXT_PUBLIC_API_URL</span> to
                derive the metrics URL.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: "Prometheus",
                url: process.env.NEXT_PUBLIC_OPS_PROMETHEUS_URL,
              },
              {
                label: "Grafana",
                url: process.env.NEXT_PUBLIC_OPS_GRAFANA_URL,
              },
              {
                label: "Fly.io dashboard",
                url: process.env.NEXT_PUBLIC_OPS_FLY_DASHBOARD_URL,
              },
              {
                label: "Sentry (org or project)",
                url: process.env.NEXT_PUBLIC_OPS_SENTRY_URL,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[var(--radius)] border border-border/70 p-4"
              >
                <p className="text-sm font-medium">{item.label}</p>
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
                    Not configured for this deployment.
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
