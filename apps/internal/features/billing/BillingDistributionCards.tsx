"use client";

import type { InternalBillingMetrics } from "@workspace/data-access/internal";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components";
import { getInternalTierBadgeClass } from "@/lib/tier-display";
import { formatBillingStatus, getBillingStatusBadgeClass } from "./billing-status";

interface BillingDistributionCardsProps {
  metrics: InternalBillingMetrics | null;
}

export function BillingDistributionCards({
  metrics,
}: BillingDistributionCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DistributionCard
        title="Subscriptions by Tier"
        entries={Object.entries(metrics?.subscriptionsByTier ?? {})}
        total={metrics?.activeSubscriptions ?? 0}
        getBadgeClass={getInternalTierBadgeClass}
        formatLabel={(tier) => tier}
      />
      <DistributionCard
        title="Subscriptions by Status"
        entries={Object.entries(metrics?.subscriptionsByStatus ?? {})}
        total={metrics?.activeSubscriptions ?? 0}
        getBadgeClass={getBillingStatusBadgeClass}
        formatLabel={formatBillingStatus}
      />
    </div>
  );
}

function DistributionCard({
  title,
  entries,
  total,
  getBadgeClass,
  formatLabel,
}: {
  title: string;
  entries: [string, number][];
  total: number;
  getBadgeClass: (key: string) => string;
  formatLabel: (key: string) => string;
}) {
  const denominator = Math.max(total, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map(([key, count]) => (
            <DistributionRow
              key={key}
              label={formatLabel(key)}
              count={count}
              width={(count / denominator) * 100}
              badgeClassName={getBadgeClass(key)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DistributionRow({
  label,
  count,
  width,
  badgeClassName,
}: {
  label: string;
  count: number;
  width: number;
  badgeClassName: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Badge className={badgeClassName}>{label}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${width}%` }} />
        </div>
        <span className="w-8 text-right text-sm font-medium">{count}</span>
      </div>
    </div>
  );
}
