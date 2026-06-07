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

type EnterpriseContractsInvoicesDialogProps = Pick<
  EnterpriseContractsPageState,
  "invoicesOpen" | "setInvoicesOpen" | "invoices"
>;

export function EnterpriseContractsInvoicesDialog(
  props: EnterpriseContractsInvoicesDialogProps,
) {
  const { invoicesOpen, setInvoicesOpen, invoices } = props;
  return (
    <BaseContractDialogShell
      open={invoicesOpen}
      onOpenChange={setInvoicesOpen}
      title="Enterprise invoices"
      description="Annual prepay, setup fee, and ad-hoc adjustments tracked separately from monthly overage invoices."
    >
      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kind</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.kind}</TableCell>
                <TableCell className="text-xs">
                  {formatDate(inv.periodStart)} → {formatDate(inv.periodEnd)}
                </TableCell>
                <TableCell>
                  {formatCurrency(inv.amountCents / 100, {
                    currency: inv.currency,
                  })}
                </TableCell>
                <TableCell>{inv.discountPercent}%</TableCell>
                <TableCell>
                  {inv.subscriptionPayment?.status ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </BaseContractDialogShell>
  );
}
