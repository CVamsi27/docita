import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@workspace/ui/components/indicators/card";

interface MetricCard {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: ReactNode;
}

interface MetricCardsGridProps { metrics: MetricCard[] }

const trendClass: Record<string, string> = { up: "text-success", down: "text-destructive", neutral: "text-muted-foreground" };

export function MetricCardsGrid({ metrics }: MetricCardsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, idx) => (
        <Card key={idx} density="compact">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-3">
              <CardDescription className="text-sm font-medium text-muted-foreground">{metric.title}</CardDescription>
              <div className="text-muted-foreground">{metric.icon}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tabular-nums">{metric.value}</p>
            {metric.change && (
              <p className={`text-sm font-medium ${trendClass[metric.trend ?? "neutral"]}`}>
                {metric.trend === "up" ? "\u2191" : metric.trend === "down" ? "\u2193" : "\u2192"} {metric.change} from last period
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
