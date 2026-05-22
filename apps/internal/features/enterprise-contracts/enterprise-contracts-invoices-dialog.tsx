"use client";

import { formatCurrency, formatDate } from "@workspace/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsInvoicesDialogProps = Pick<EnterpriseContractsPageState, 'invoicesOpen' | 'setInvoicesOpen' | 'invoices'>;

export function EnterpriseContractsInvoicesDialog(props: EnterpriseContractsInvoicesDialogProps) {
  const { invoicesOpen, setInvoicesOpen, invoices } = props;
  return (
    <Dialog open={invoicesOpen} onOpenChange={setInvoicesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enterprise invoices</DialogTitle>
            <DialogDescription>
              Annual prepay and ad-hoc adjustments tracked separately from
              monthly overage invoices.
            </DialogDescription>
          </DialogHeader>
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
                      {formatDate(inv.periodStart)} →{" "}
                      {formatDate(inv.periodEnd)}
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
        </DialogContent>
      </Dialog>
  );
}
