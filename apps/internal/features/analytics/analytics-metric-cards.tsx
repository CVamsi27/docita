"use client";

import type { MetricCard } from "./analytics-helpers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/indicators/card";
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
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, idx) => (
        <Card key={idx} density="compact">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-3">
              <CardDescription className="text-sm font-medium text-muted-foreground">
                {metric.title}
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
                  ? "↑"
                  : metric.trend === "down"
                    ? "↓"
                    : "→"}{" "}
                {metric.change} from last period
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
