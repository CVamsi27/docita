"use client";

import { usePartnerAuth } from "../hooks/use-partner-auth";
import { usePartnerPayouts } from "@workspace/data-access";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";
import { formatPaise } from "../lib/format-currency";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  PAID: "Paid",
  VOID: "Void",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PENDING: "outline",
  APPROVED: "secondary",
  PAID: "default",
  VOID: "outline",
};

export function PartnerPayoutsView() {
  const auth = usePartnerAuth();
  const ctx = auth.buildContext();
  const payouts = usePartnerPayouts(ctx.accessToken, ctx.baseUrl);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payouts</h1>
        <p className="text-sm text-muted-foreground">
          Revenue-share payouts from your referred clinics' first-year billing. Manual disbursement via bank transfer.
        </p>
      </div>

      {payouts.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading payouts...</div>
      ) : payouts.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Could not load payouts</CardTitle>
            <CardDescription>
              {payouts.error instanceof Error
                ? payouts.error.message
                : "Try again in a moment."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : !payouts.data || payouts.data.items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No payouts yet. They'll appear here once your referred clinics start paying.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-md border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Period</th>
                <th className="px-3 py-2 text-right font-medium">Base</th>
                <th className="px-3 py-2 text-right font-medium">Rate</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.data.items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.periodStart.slice(0, 10)} → {row.periodEnd.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatPaise(row.baseRevenueCents)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.ratePercent}%</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {formatPaise(row.amountCents)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
