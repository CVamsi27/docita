"use client";

import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/data-display/table-essentials";
import { ListRowGroup, TableFooter } from "@workspace/ui/components";
import type { BillingHistoryItem } from "@workspace/data-access";
import {
  subscriptionBillingCaption,
} from "@/features/subscription/lib/billing-display-messages";
import {
  formatMoney,
} from "./billing-history-table-helpers";
import { BillingInvoiceMobileRow, BillingInvoiceDesktopRow } from "./billing-history-invoice-table-sections";

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
  const { t } = useTranslation("Subscription");
  return (
    <div className="rounded-lg border">
      <div className="md:hidden">
        <ListRowGroup>
          {invoices.map((invoice) => (
            <BillingInvoiceMobileRow
              key={invoice.id}
              invoice={invoice}
              onDownload={onDownload}
              onPayNow={onPayNow}
              resumePaymentPending={resumePaymentPending}
              onResumePayment={onResumePayment}
            />
          ))}
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
            {subscriptionBillingCaption(t)}
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
            {invoices.map((invoice) => (
              <BillingInvoiceDesktopRow
                key={invoice.id}
                invoice={invoice}
                onDownload={onDownload}
                onPayNow={onPayNow}
                resumePaymentPending={resumePaymentPending}
                onResumePayment={onResumePayment}
              />
            ))}
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
