"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
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

function normalizeStatus(status: string | undefined): string {
  return (status ?? "").toLowerCase().trim();
}

function isPaidStatus(status: string): boolean {
  return status === "paid" || status === "captured";
}

function isTerminalClosed(status: string): boolean {
  return status === "refunded" || status === "void" || status === "voided";
}

function isFailedLike(status: string): boolean {
  return status === "failed" || status === "declined";
}

function isPendingLike(status: string): boolean {
  return (
    status === "pending" ||
    status === "processing" ||
    status === "created" ||
    status === "requires_action" ||
    status === "attempted" ||
    status === "due"
  );
}

function badgeClassForStatus(status: string): string {
  if (isPaidStatus(status)) return "badge-success";
  if (isTerminalClosed(status)) return "";
  if (isFailedLike(status)) return "badge-destructive";
  if (isPendingLike(status)) return "badge-warning";
  return "badge-warning";
}

type StatusFilterValue =
  | "all"
  | "paid"
  | "pending"
  | "failed"
  | "refunded_void";

function matchesStatusFilter(
  status: string,
  filter: StatusFilterValue,
): boolean {
  if (filter === "all") return true;
  if (filter === "paid") return isPaidStatus(status);
  if (filter === "pending") return isPendingLike(status) || (!isPaidStatus(status) && !isTerminalClosed(status) && !isFailedLike(status));
  if (filter === "failed") return isFailedLike(status);
  if (filter === "refunded_void") return isTerminalClosed(status);
  return true;
}

function parseDayBoundary(
  value: string,
  endOfDay: boolean,
): number | null {
  if (!value.trim()) return null;
  const d = new Date(value + (endOfDay ? "T23:59:59.999" : "T00:00:00.000"));
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
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
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasRows = (invoices?.length ?? 0) > 0;

  const filteredInvoices = useMemo(() => {
    const list = invoices ?? [];
    const fromTs = parseDayBoundary(dateFrom, false);
    const toTs = parseDayBoundary(dateTo, true);

    return list.filter((inv) => {
      const status = normalizeStatus(inv.status);
      if (!matchesStatusFilter(status, statusFilter)) return false;
      const created = new Date(inv.createdAt).getTime();
      if (fromTs !== null && created < fromTs) return false;
      if (toTs !== null && created > toTs) return false;
      return true;
    });
  }, [invoices, statusFilter, dateFrom, dateTo]);

  const filteredHasRows = filteredInvoices.length > 0;
  const primaryCurrency =
    filteredInvoices[0]?.currency ?? invoices?.[0]?.currency ?? DEFAULT_CURRENCY;

  const paidTotalCents = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => {
      if (!isPaidStatus(normalizeStatus(inv.status))) return sum;
      const c = inv.currency || DEFAULT_CURRENCY;
      if (c !== primaryCurrency) return sum;
      return sum + inv.amountCents;
    }, 0);
  }, [filteredInvoices, primaryCurrency]);

  const csvRows = useMemo(() => filteredInvoices, [filteredInvoices]);

  const handleDownload = (url: string) => window.open(url, "_blank");

  const handleExportCsv = () => {
    if (!filteredHasRows) return;

    const header = [
      "Date",
      "PaidAt",
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
      const paidAt = invoice.paidAt
        ? new Date(invoice.paidAt).toISOString()
        : "";
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
        paidAt,
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
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="grid w-full gap-2 sm:w-auto sm:min-w-[140px]">
            <Label htmlFor="billing-filter-status" className="text-xs">
              Status
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}
            >
              <SelectTrigger id="billing-filter-status" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending / unpaid</SelectItem>
                <SelectItem value="failed">Failed / declined</SelectItem>
                <SelectItem value="refunded_void">Refunded / void</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:min-w-[140px]">
            <Label htmlFor="billing-filter-from" className="text-xs">
              From
            </Label>
            <Input
              id="billing-filter-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:min-w-[140px]">
            <Label htmlFor="billing-filter-to" className="text-xs">
              To
            </Label>
            <Input
              id="billing-filter-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="sm:ml-auto"
            onClick={() => {
              setStatusFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear filters
          </Button>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportCsv}
            disabled={!filteredHasRows}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {!filteredHasRows ? (
          <div className="rounded-lg border bg-muted/20 py-8 text-center text-sm text-muted-foreground">
            No rows match the current filters.
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table className="min-w-0 table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[96px] sm:w-[120px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[110px] sm:w-[140px]">
                    Amount
                  </TableHead>
                  <TableHead className="w-[90px] sm:w-[110px]">Status</TableHead>
                  <TableHead className="w-[88px] sm:w-[120px] text-right">
                    Receipt
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const withActions = invoice as BillingHistoryItemWithActions;
                  const status = normalizeStatus(invoice.status);
                  const isPaid = isPaidStatus(status);
                  const receiptUrl = isPaid
                    ? (withActions.receiptUrl ?? invoice.invoiceUrl)
                    : undefined;
                  const payUrl =
                    withActions.payUrl ??
                    (!isPaid ? invoice.invoiceUrl : undefined);
                  const terminalClosed = isTerminalClosed(status);
                  const showPayNow =
                    !isPaid &&
                    !terminalClosed &&
                    !(isFailedLike(status) && !payUrl);

                  const dateCell = (
                    <span>
                      {new Date(invoice.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  );

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        {invoice.paidAt ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="cursor-default text-left underline decoration-dotted underline-offset-2"
                              >
                                {dateCell}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Paid{" "}
                              {new Date(invoice.paidAt).toLocaleString("en-IN")}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          dateCell
                        )}
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
                            badgeClassForStatus(status),
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
                        ) : showPayNow ? (
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
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-medium">
                    Paid total ({primaryCurrency})
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatMoney(paidTotalCents, primaryCurrency)}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
