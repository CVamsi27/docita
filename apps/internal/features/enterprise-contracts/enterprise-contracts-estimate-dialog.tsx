"use client";

import { formatCurrency, formatDate } from "@workspace/utils";
// jscpd:ignore-start
import {
  BaseContractDialogShell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./base-dialog-shell";
// jscpd:ignore-end
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsEstimateDialogProps = Pick<EnterpriseContractsPageState, 'estimateOpen' | 'setEstimateOpen' | 'estimate' | 'estimateLoading'>;

export function EnterpriseContractsEstimateDialog(props: EnterpriseContractsEstimateDialogProps) {
  const { estimateOpen, setEstimateOpen, estimate, estimateLoading } = props;
  return (
    <BaseContractDialogShell
      open={estimateOpen}
      onOpenChange={setEstimateOpen}
      title="Current period estimate"
      description="Live meter readings + projected month-end invoice (aggregated across all member clinics)."
    >
      {estimateLoading || !estimate ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3 text-sm">
          <p>
            Period:{" "}
            <strong>
              {formatDate(estimate.period.start)} →{" "}
              {formatDate(estimate.period.end)}
            </strong>
          </p>
          <p className="text-xs text-muted-foreground">
            {estimate.contract.memberClinicIds.length} member clinic(s)
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meter</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Included</TableHead>
                <TableHead className="text-right">Overage</TableHead>
                <TableHead className="text-right">Charge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(estimate.meters).map(([k, m]) => (
                <TableRow key={k}>
                  <TableCell>{k}</TableCell>
                  <TableCell className="text-right">{m.current}</TableCell>
                  <TableCell className="text-right">{m.included}</TableCell>
                  <TableCell className="text-right">{m.overage}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(m.chargeCents / 100, {
                      currency: estimate.currency,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between border-t pt-2">
            <span>Platform fee</span>
            <strong>
              {formatCurrency(estimate.platformFeeCents / 100, {
                currency: estimate.currency,
              })}
            </strong>
          </div>
          <div className="flex justify-between">
            <span>Overage total</span>
            <strong>
              {formatCurrency(estimate.overageTotalCents / 100, {
                currency: estimate.currency,
              })}
            </strong>
          </div>
          <div className="flex justify-between text-base">
            <span>Projected month total</span>
            <strong>
              {formatCurrency(estimate.projectedMonthTotalCents / 100, {
                currency: estimate.currency,
              })}
            </strong>
          </div>
        </div>
      )}
    </BaseContractDialogShell>
  );
}
