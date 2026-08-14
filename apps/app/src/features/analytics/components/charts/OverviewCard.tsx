import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";
import { TrendingDown, TrendingUp } from "lucide-react";
import React from "react";

interface OverviewCardProps {
  title: string;
  value: string | number;
  growth?: number;
  icon: React.ElementType;
  subtitle?: string;
}

export const OverviewCard = ({
  title,
  value,
  growth,
  icon: Icon,
  subtitle,
}: OverviewCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
        {value}
      </div>
      {growth !== undefined ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {growth > 0 ? (
            <>
              <TrendingUp className="h-3 w-3 text-success" /> +{growth}%
            </>
          ) : (
            <>
              <TrendingDown className="h-3 w-3 text-destructive" /> {growth}%
            </>
          )}
          <span className="ml-1">from last month</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
    </CardContent>
  </Card>
);
