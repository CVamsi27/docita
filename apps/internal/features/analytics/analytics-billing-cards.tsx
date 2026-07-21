"use client";

import { BarChart3, DollarSign } from "lucide-react";
import { getInternalTierChartColorClass } from "@/lib/tier-display";
import type { InternalBillingMetrics } from "@workspace/data-access/internal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";

interface BillingOverviewCardsProps {
  billing: InternalBillingMetrics;
  formatCurrency: (amount: number) => string;
  tierEntries: [string, number][];
  totalTierCount: number;
}

export function BillingOverviewCards({
  billing,
  formatCurrency,
  tierEntries,
  totalTierCount,
}: BillingOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card density="compact">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="ui-copy-stack">
              <CardTitle>MRR</CardTitle>
              <CardDescription>
                Recurring monthly revenue snapshot
              </CardDescription>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="ui-copy-stack">
          <p className="ui-page-title">{formatCurrency(billing.mrr)}</p>
          <p className="ui-helper-text">
            ARR: {formatCurrency(billing.arr)}
          </p>
        </CardContent>
      </Card>

      <Card density="compact">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="ui-copy-stack">
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>
                Paid customers across all tiers
              </CardDescription>
            </div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="ui-copy-stack">
          <p className="ui-page-title">{billing.activeSubscriptions}</p>
          <p className="ui-helper-text">
            Churn rate: {(billing.churnRate * 100).toFixed(1)}% (30d)
          </p>
        </CardContent>
      </Card>

      <Card density="compact">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="ui-copy-stack">
              <CardTitle>Tier Distribution</CardTitle>
              <CardDescription>
                Subscription share by plan tier
              </CardDescription>
            </div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {tierEntries.map(([tier, count]) => (
            <div key={tier} className="flex items-center gap-2">
              <span className="w-16 truncate ui-helper-text">{tier}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${getInternalTierChartColorClass(tier)}`}
                  style={{
                    width: `${totalTierCount > 0 ? (count / totalTierCount) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="w-6 text-right text-sm font-medium text-foreground">
                {count}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
