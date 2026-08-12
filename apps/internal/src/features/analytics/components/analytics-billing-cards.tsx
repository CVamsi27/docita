import { BarChart3, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";

interface BillingData { mrr: number; arr: number; activeSubscriptions: number; churnRate: number; }

export function BillingOverviewCards({ billing, formatCurrency }:
  { billing: BillingData; formatCurrency: (a: number) => string }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card density="compact">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1"><CardTitle>MRR</CardTitle><CardDescription>Recurring monthly revenue</CardDescription></div>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent><p className="text-2xl font-semibold tabular-nums">{formatCurrency(billing.mrr)}</p>
          <p className="text-sm text-muted-foreground">ARR: {formatCurrency(billing.arr)}</p></CardContent>
      </Card>
      <Card density="compact">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1"><CardTitle>Active Subscriptions</CardTitle><CardDescription>Paid customers</CardDescription></div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent><p className="text-2xl font-semibold tabular-nums">{billing.activeSubscriptions}</p>
          <p className="text-sm text-muted-foreground">Churn: {(billing.churnRate * 100).toFixed(1)}% (30d)</p></CardContent>
      </Card>
    </div>
  );
}
