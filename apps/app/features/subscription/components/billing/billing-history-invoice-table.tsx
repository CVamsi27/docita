"use client";

import { Download } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
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
  TooltipTrigger,
} from "@workspace/ui/components/overlay/tooltip";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { cn } from "@workspace/ui/lib/utils";
import {
  ListRow,
  ListRowGroup,
} from "@workspace/ui/components/data-display/list-row";
import type { BillingHistoryItem } from "@workspace/data-access";
import { formatDate, formatDateTime } from "@/lib/formatters";
import {
  BILLING_HISTORY_TABLE_CAPTION,
  formatInvoiceDescriptionForDisplay,
} from "@/features/subscription/lib/billing-display-messages";
import {
  badgeClassForStatus,
  formatMoney,
  isBillingRowPaid,
  isFailedLike,
  isTerminalClosed,
  normalizeStatus,
  readBillingHistoryActions,
  resolveBillingAmountCents,
} from "./billing-history-table-helpers";

export function BillingHistoryInvoiceTable({
  invoices,
  primaryCurrency,
  paidTotalCents,
  footerNote,
  onDownload,
  onPayNow,
  resumePaymentPending,
  onResumePayment,
}: {
  invoices: BillingHistoryItem[];
  primaryCurrency: string;
  paidTotalCents: number;
  footerNote?: string;
  onDownload: (url: string) => void;
  onPayNow?: () => void;
  resumePaymentPending: boolean;
  onResumePayment: (
    invoice: BillingHistoryItem,
    payUrl?: string,
  ) => Promise<void>;
}) {
  return (
    <div className="rounded-lg border">
      <div className="md:hidden">
        <ListRowGroup>
          {invoices.map((invoice) => {
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
          })}
        </ListRowGroup>
        <div className="border-t px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            Paid total ({primaryCurrency}):{" "}
          </span>
          <span className="font-semibold tabular-nums">
            {formatMoney(paidTotalCents, primaryCurrency)}
          </span>
        </div>
      </div>
      <div className="hidden overflow-x-auto md:block">
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
            {invoices.map((invoice) => {
              const withActions = readBillingHistoryActions(invoice);
              const status = normalizeStatus(invoice.status);
              const isPaid = isBillingRowPaid(invoice);
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

              const dateCell = <span>{formatDate(invoice.createdAt)}</span>;
              const { label, detail } = formatInvoiceDescriptionForDisplay(
                invoice.description,
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
  );
}
