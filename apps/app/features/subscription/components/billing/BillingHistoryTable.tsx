"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import {
  Button,
  EmptyState,
  TooltipProvider
} from "@workspace/ui/components";
import type { BillingHistoryItem } from "@workspace/data-access";
import { useResumeSubscriptionPayment } from "@workspace/data-access";
import { DEFAULT_CURRENCY } from "@workspace/utils";
import {
  buildBillingCsvContent,
  isBillingRowPaid,
  matchesStatusFilter,
  normalizeStatus,
  resolveBillingAmountCents,
  parseDayBoundary,
  triggerCsvDownload,
  type StatusFilterValue,
} from "./billing-history-table-helpers";
import { BillingHistoryTableFilters } from "./billing-history-table-filters";
import { BillingHistoryInvoiceTable } from "./billing-history-invoice-table";

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
  footerNote?: string;
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
    filteredInvoices[0]?.currency ??
    invoices?.[0]?.currency ??
    DEFAULT_CURRENCY;

  const paidTotalCents = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => {
      if (!isBillingRowPaid(inv)) return sum;
      const c = inv.currency || DEFAULT_CURRENCY;
      if (c !== primaryCurrency) return sum;
      return sum + resolveBillingAmountCents(inv);
    }, 0);
  }, [filteredInvoices, primaryCurrency]);

  const handleDownload = (url: string) => window.open(url, "_blank");

  const handleExportCsv = () => {
    if (!filteredHasRows) return;
    triggerCsvDownload(buildBillingCsvContent(filteredInvoices));
  };

  const handleResumePayment = async (
    invoice: BillingHistoryItem,
    payUrl?: string,
  ) => {
    if (payUrl) {
      handleDownload(payUrl);
      return;
    }
    const resumed = await resumePayment.mutateAsync(invoice.id);
    handleDownload(resumed.payUrl);
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
        <BillingHistoryTableFilters
          statusFilter={statusFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onStatusFilterChange={setStatusFilter}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClear={() => {
            setStatusFilter("all");
            setDateFrom("");
            setDateTo("");
          }}
        />

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
          <BillingHistoryInvoiceTable
            invoices={filteredInvoices}
            primaryCurrency={primaryCurrency}
            paidTotalCents={paidTotalCents}
            footerNote={footerNote}
            onDownload={handleDownload}
            onPayNow={onPayNow}
            resumePaymentPending={resumePayment.isPending}
            onResumePayment={handleResumePayment}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
