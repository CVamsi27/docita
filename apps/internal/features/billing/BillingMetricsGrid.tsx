"use client";

import { ArrowDownRight, ArrowUpRight, DollarSign, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";
import { DEFAULT_CURRENCY, formatCurrency } from "@workspace/utils";
import type { InternalBillingMetrics } from "@workspace/data-access/internal";

interface BillingMetricsGridProps {
  metrics: InternalBillingMetrics | null;
}

export function BillingMetricsGrid({ metrics }: BillingMetricsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Monthly Recurring Revenue
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {formatCurrency(metrics?.mrr || 0, {
              currency: DEFAULT_CURRENCY,
              fractionDigits: 0,
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-success">
              <ArrowUpRight className="inline h-3 w-3" /> MRR
            </span>
            <span className="ml-1">from active subscriptions</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Annual Recurring Revenue
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {formatCurrency(metrics?.arr || 0, {
              currency: DEFAULT_CURRENCY,
              fractionDigits: 0,
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Projected annual revenue
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Subscriptions
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {metrics?.activeSubscriptions || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-info">
              {metrics?.trialSubscriptions || 0} in trial
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Churn rate</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {((metrics?.churnRate || 0) * 100).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            <span
              className={
                metrics?.churnRate && metrics.churnRate > 0.05
                  ? "text-destructive"
                  : "text-success"
              }
            >
              {metrics?.churnRate && metrics.churnRate > 0.05 ? (
                <>
                  <ArrowUpRight className="inline h-3 w-3" /> Above target
                </>
              ) : (
                <>
                  <ArrowDownRight className="inline h-3 w-3" /> On target
                </>
              )}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
