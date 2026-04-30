"use client";

import { useMemo } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { cn } from "@workspace/ui/lib/utils";
import { DEFAULT_CURRENCY, formatCurrency } from "@workspace/utils";
import type { BillingHistoryItem } from "@/hooks/api/use-billing-history";
import { useResumeSubscriptionPayment } from "@/hooks/api/use-resume-subscription-payment";

type BillingHistoryItemWithActions = BillingHistoryItem & {
  payUrl?: string;
  receiptUrl?: string;
};

function formatMoney(amountCents: number, currency: string | undefined) {
  return formatCurrency(amountCents / 100, {
    currency: currency || DEFAULT_CURRENCY,
  });
}

export function BillingHistoryTable({
  invoices,
  isLoading,
  onPayNow,
}: {
  invoices: BillingHistoryItem[] | undefined;
  isLoading?: boolean;
  onPayNow?: () => void;
}) {
  const resumePayment = useResumeSubscriptionPayment();

  const hasRows = (invoices?.length ?? 0) > 0;
  const csvRows = useMemo(() => invoices ?? [], [invoices]);

  const handleDownload = (url: string) => window.open(url, "_blank");

  const handleExportCsv = () => {
    if (!hasRows) return;

    const header = [
      "Date",
      "Description",
      "Amount",
      "Currency",
      "Status",
      "PayUrl",
      "ReceiptUrl",
    ];

    const rows = csvRows.map((invoice) => {
      const withActions = invoice as BillingHistoryItemWithActions;
      const formattedDate = new Date(invoice.createdAt).toISOString();
      const description = (
        invoice.description || "Subscription Payment"
      ).replaceAll('"', '""');
      const amount = (invoice.amountCents / 100).toFixed(2);
      const currency = invoice.currency || DEFAULT_CURRENCY;
      const status = invoice.status;
      const payUrl = withActions.payUrl ?? "";
      const receiptUrl = withActions.receiptUrl ?? "";

      return [
        formattedDate,
        `"${description}"`,
        amount,
        currency,
        status,
        `"${payUrl}"`,
        `"${receiptUrl}"`,
      ].join(",");
    });

    const csvContent = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `billing-history-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasRows) {
    return (
      <div className="rounded-lg border bg-muted/20 py-10 text-center text-muted-foreground">
        <FileText className="mx-auto mb-2 h-10 w-10 opacity-20" />
        <p className="font-medium text-foreground">No billing history yet</p>
        <p className="mt-1 text-sm">
          Receipts and invoices will appear after checkout.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleExportCsv}
          disabled={!hasRows}
        >
          <Download className="h-4 w-4" />
          Export All CSV
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table className="min-w-0 table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[96px] sm:w-[120px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[110px] sm:w-[140px]">Amount</TableHead>
              <TableHead className="w-[90px] sm:w-[110px]">Status</TableHead>
              <TableHead className="w-[88px] sm:w-[120px] text-right">
                Receipt
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices!.map((invoice) => {
              const withActions = invoice as BillingHistoryItemWithActions;
              const status = invoice.status?.toLowerCase?.() ?? "";
              const isPaid = status === "paid";
              const receiptUrl = isPaid
                ? (withActions.receiptUrl ?? invoice.invoiceUrl)
                : undefined;
              const payUrl =
                withActions.payUrl ??
                (!isPaid ? invoice.invoiceUrl : undefined);

              return (
                <TableRow key={invoice.id}>
                  <TableCell>
                    {new Date(invoice.createdAt).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell className="min-w-0 break-words text-muted-foreground">
                    {invoice.description || "Subscription Payment"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatMoney(invoice.amountCents, invoice.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        isPaid ? "badge-success" : "badge-warning",
                      )}
                    >
                      {humanizeUiLabel(invoice.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {receiptUrl ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(receiptUrl)}
                        className="h-8"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                      </Button>
                    ) : !isPaid ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={resumePayment.isPending}
                        onClick={async () => {
                          onPayNow?.();
                          if (payUrl) {
                            handleDownload(payUrl);
                            return;
                          }
                          const resumed = await resumePayment.mutateAsync(
                            invoice.id,
                          );
                          handleDownload(resumed.payUrl);
                        }}
                      >
                        Pay now
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
