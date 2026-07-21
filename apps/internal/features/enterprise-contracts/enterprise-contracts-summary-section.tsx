"use client";

import { formatCurrency } from "@workspace/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsSummarySectionProps = Pick<
  EnterpriseContractsPageState,
  "totals" | "error"
>;

export function EnterpriseContractsSummarySection({
  totals,
  error,
}: EnterpriseContractsSummarySectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total contracts</CardDescription>
            <CardTitle className="text-3xl">{totals.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl">{totals.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Drafts</CardDescription>
            <CardTitle className="text-3xl">{totals.draft}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Platform-fee MRR (active)</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(totals.mrrCents / 100, { currency: "INR" })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}
    </>
  );
}
