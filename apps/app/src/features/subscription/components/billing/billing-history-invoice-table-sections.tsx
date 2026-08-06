"use client";

import { Download } from "lucide-react";
import { Badge, Button, ListRow, TableCell, TableRow, Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { cn } from "@workspace/ui/lib/utils";
import type { BillingHistoryItem } from "@workspace/data-access";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { formatInvoiceDescriptionForDisplay } from "@/features/subscription/lib/billing-display-messages";
import { badgeClassForStatus, formatMoney, isBillingRowPaid, isFailedLike, isTerminalClosed, normalizeStatus, readBillingHistoryActions, resolveBillingAmountCents } from "./billing-history-table-helpers";

function getInvoiceRowData(invoice: BillingHistoryItem) {
  const withActions = readBillingHistoryActions(invoice);
  const status = normalizeStatus(invoice.status);
  const isPaid = isBillingRowPaid(invoice);
  const receiptUrl = isPaid
    ? (withActions.receiptUrl ?? invoice.invoiceUrl)
    : undefined;
  const payUrl =
    withActions.payUrl ?? (!isPaid ? invoice.invoiceUrl : undefined);
  const terminalClosed = isTerminalClosed(status);
  const showPayNow =
    !isPaid && !terminalClosed && !(isFailedLike(status) && !payUrl);
  const { label, detail } = formatInvoiceDescriptionForDisplay(
    invoice.description,
  );
  return { withActions, status, isPaid, receiptUrl, payUrl, terminalClosed, showPayNow, label, detail };
}

// jscpd:ignore-start
export function BillingInvoiceMobileRow({
  invoice,
  onDownload,
  onPayNow,
  resumePaymentPending,
  onResumePayment,
}: {
  invoice: BillingHistoryItem;
  onDownload: (url: string) => void;
  onPayNow?: () => void;
  resumePaymentPending: boolean;
  onResumePayment: (invoice: BillingHistoryItem, payUrl?: string) => Promise<void>;
}) {
  const { receiptUrl, showPayNow, label, detail, status, payUrl } = getInvoiceRowData(invoice);
// jscpd:ignore-end

  return (
    <ListRow
      key={invoice.id}
      title={label}
      meta={detail ?? undefined}
      time={formatDate(invoice.createdAt)}
      status={status}
      statusLabel={humanizeUiLabel(invoice.status)}
      showChevron={false}
      trailing={
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-medium tabular-nums">
            {formatMoney(
              resolveBillingAmountCents(invoice),
              invoice.currency,
            )}
          </span>
          {receiptUrl ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => onDownload(receiptUrl)}
            >
              <Download className="mr-1 h-4 w-4" />
              PDF
            </Button>
          ) : showPayNow ? (
            <Button
              variant="outline"
              size="sm"
              disabled={resumePaymentPending}
              onClick={() => {
                onPayNow?.();
                void onResumePayment(invoice, payUrl);
              }}
            >
              Pay now
            </Button>
          ) : null}
        </div>
      }
    />
  );
}

// jscpd:ignore-start
export function BillingInvoiceDesktopRow({
  invoice,
  onDownload,
  onPayNow,
  resumePaymentPending,
  onResumePayment,
}: {
  invoice: BillingHistoryItem;
  onDownload: (url: string) => void;
  onPayNow?: () => void;
  resumePaymentPending: boolean;
  onResumePayment: (invoice: BillingHistoryItem, payUrl?: string) => Promise<void>;
}) {
  const { status, isPaid: _isPaid, receiptUrl, payUrl, showPayNow, label, detail } = getInvoiceRowData(invoice);
// jscpd:ignore-end

  const dateCell = <span>{formatDate(invoice.createdAt)}</span>;

  return (
    <TableRow key={invoice.id}>
      <TableCell>
        {invoice.paidAt ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="cursor-default text-left underline decoration-dotted underline-offset-2"
                aria-label={`Paid on ${formatDateTime(invoice.paidAt)}`}
              >
                {dateCell}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Paid {formatDateTime(invoice.paidAt)}
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
        {formatMoney(
          resolveBillingAmountCents(invoice),
          invoice.currency,
        )}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn("capitalize", badgeClassForStatus(status))}
        >
          {humanizeUiLabel(invoice.status)}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        {receiptUrl ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDownload(receiptUrl)}
            className="h-8"
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        ) : showPayNow ? (
          <Button
            variant="outline"
            size="sm"
            disabled={resumePaymentPending}
            onClick={() => {
              onPayNow?.();
              void onResumePayment(invoice, payUrl);
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
}
