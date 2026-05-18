"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Label } from "@workspace/ui/components/form/label";
import { IsoDatePickerField } from "@workspace/ui/components/form/iso-date-picker-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/overlay/tooltip";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { cn } from "@workspace/ui/lib/utils";
import type { BillingHistoryItem } from "@workspace/data-access";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { useResumeSubscriptionPayment } from "@/hooks/api/use-resume-subscription-payment";
import {
  formatInvoiceDescriptionForDisplay,
  BILLING_HISTORY_TABLE_CAPTION,
} from "@/features/subscription/lib/billing-display-messages";
import { DEFAULT_CURRENCY } from "@workspace/utils";
import {
  formatMoney,
  normalizeStatus,
  isPaidStatus,
  isTerminalClosed,
  isFailedLike,
  badgeClassForStatus,
  matchesStatusFilter,
  parseDayBoundary,
  buildBillingCsvContent,
  triggerCsvDownload,
  type StatusFilterValue,
  type BillingHistoryItemWithActions,
} from "./billing-history-table-helpers";

export function BillingHistoryTable({
  invoices,
  isLoading,
  onPayNow,
  footerNote,
  emptyStateDescription,
}: {
  invoices: BillingHistoryItem[] | undefined;
  isLoading?: boolean;
  onPayNow?: () => void;
  /** Optional note below the table (e.g. billing policy context). */
  footerNote?: string;
  /** Overrides default empty copy when there are no rows at all. */
  emptyStateDescription?: string;
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

  const handleDownload = (url: string) => window.open(url, "_blank");

  const handleExportCsv = () => {
    if (!filteredHasRows) return;
    triggerCsvDownload(buildBillingCsvContent(filteredInvoices));
  };

  if (isLoading) {
    return (
      <div
        className="flex justify-center p-8"
        role="status"
        aria-live="polite"
        aria-label="Loading billing history"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-8 w-8 text-muted-foreground"
        />
      </div>
    );
  }

  if (!hasRows) {
    return (
      <EmptyState
        icon={FileText}
        title="No billing history yet"
        description={
          emptyStateDescription ??
          "Receipts and invoices will appear after checkout."
        }
      />
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
            <IsoDatePickerField
              id="billing-filter-from"
              label=""
              showLabel={false}
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Any"
              triggerClassName="h-9 sm:w-auto sm:min-w-[140px]"
            />
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:min-w-[140px]">
            <Label htmlFor="billing-filter-to" className="text-xs">
              To
            </Label>
            <IsoDatePickerField
              id="billing-filter-to"
              label=""
              showLabel={false}
              value={dateTo}
              onChange={setDateTo}
              placeholder="Any"
              triggerClassName="h-9 sm:w-auto sm:min-w-[140px]"
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
          <EmptyState
            icon={FileText}
            title="No matching invoices"
            description="Try clearing filters or widening the date range."
          />
        ) : (
          <div className="rounded-lg border">
            <div className="overflow-x-auto">
              <Table className="min-w-[min(100%,36rem)] table-auto">
                <caption className="caption-bottom px-3 pb-3 pt-2 text-left text-[var(--fs-2xs)] leading-snug text-muted-foreground">
                  {BILLING_HISTORY_TABLE_CAPTION}
                </caption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[96px] sm:w-[120px]">Date</TableHead>
                  <TableHead className="min-w-[10rem]">Description</TableHead>
                  <TableHead className="w-[110px] sm:w-[140px] whitespace-nowrap">
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
                    <span>{formatDate(invoice.createdAt)}</span>
                  );
                  const { label, detail } =
                    formatInvoiceDescriptionForDisplay(invoice.description);

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
                              {formatDateTime(invoice.paidAt)}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          dateCell
                        )}
                      </TableCell>
                      <TableCell className="min-w-0 max-w-[14rem] sm:max-w-md">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">
                            {label}
                          </span>
                          {detail ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="line-clamp-2 cursor-default text-[var(--fs-2xs)] text-muted-foreground">
                                  {detail}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                {detail}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
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
            {footerNote ? (
              <p className="border-t px-3 py-2 text-left text-[var(--fs-2xs)] leading-snug text-muted-foreground">
                {footerNote}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
