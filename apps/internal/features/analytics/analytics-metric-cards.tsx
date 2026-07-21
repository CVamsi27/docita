"use client";

import { useTranslations } from "next-intl";
import type { MetricCard } from "./analytics-helpers";
import { Card, CardContent, CardDescription, CardHeader } from "@workspace/ui/components/indicators/card";
import { cn } from "@workspace/ui/lib/utils";

const trendToneClassNames: Record<NonNullable<MetricCard["trend"]>, string> = {
  up: "text-success",
  down: "text-destructive",
  neutral: "text-muted-foreground",
};

interface MetricCardsGridProps {
  metrics: MetricCard[];
}

export function MetricCardsGrid({ metrics }: MetricCardsGridProps) {
  const t = useTranslations("InternalAnalytics");
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, idx) => {
        // Phase 6.6: resolve metric.title through t() when titleKey is
        // present, falling back to the hardcoded English title.
        const title = metric.titleKey
          ? t(metric.titleKey) || metric.title
          : metric.title;
        return (
          <Card key={idx} density="compact">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <CardDescription className="text-sm font-medium text-muted-foreground">
                  {title}
                </CardDescription>
                <div className="text-muted-foreground">{metric.icon}</div>
              </div>
            </CardHeader>
            <CardContent className="ui-copy-stack">
              <p className="ui-page-title">{metric.value}</p>
              {metric.change && (
                <p
                  className={cn(
                    "text-sm font-medium",
                    trendToneClassNames[metric.trend ?? "neutral"],
                  )}
                >
                  {metric.trend === "up"
                    ? "\u2191"
                    : metric.trend === "down"
                      ? "\u2193"
                      : "\u2192"}{" "}
                  {metric.change} from last period
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
