"use client";

import { useTranslations } from "next-intl";
import { Separator } from "@workspace/ui/components/layout/separator";
import { Invoice, InvoiceItem } from "@workspace/types";
import {
  formatTaxInvoiceType,
  invoiceAmountPaid,
  invoiceBalanceDue,
} from "@workspace/types";

type InvoiceWithExtras = Invoice & {
  discount?: number;
};

interface InvoiceTotalsOnlyProps {
  invoice: InvoiceWithExtras;
  calculateSubtotal: (items: InvoiceItem[]) => number;
  formatCurrency: (amount: number) => string;
  numberToWords: (amount: number) => string;
}

/**
 * Phase 3 (per-feature): apps/app invoice totals panel used
 * on the invoice detail page and the print view. 10 literals
 * converted to useTranslations("Invoices.totals").
 */
function useInvoiceTotalsTranslations() {
  return useTranslations("Invoices.totals");
}

export function InvoiceTotalsOnly({
  invoice,
  calculateSubtotal,
  formatCurrency,
  numberToWords,
}: InvoiceTotalsOnlyProps) {
  const t = useInvoiceTotalsTranslations();
  const subtotal = invoice.subtotal || calculateSubtotal(invoice.items || []);
  const discountTotal = invoice.discountTotal || invoice.discount || 0;
  const taxTotal = invoice.taxTotal || 0;
  const grandTotal =
    invoice.grandTotal || invoice.totalAmount || invoice.total || 0;
  const amountPaid = invoiceAmountPaid(invoice);
  const balanceDue = invoiceBalanceDue(invoice);

  return (
    <div className="flex flex-col md:flex-row justify-between gap-6">
      <div className="flex-1">
        <div className="text-sm text-muted-foreground mb-4">
          <p className="font-medium mb-1">{t("amountInWordsLabel")}</p>
          <p className="italic">{numberToWords(grandTotal)}</p>
        </div>
        {invoice.notes && (
          <div className="text-sm p-4 bg-muted/30 rounded-lg max-w-md">
            <p className="font-semibold mb-1">{t("notesLabel")}</p>
            <p className="text-muted-foreground">{invoice.notes}</p>
          </div>
        )}
      </div>
      <div className="w-full md:w-64 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("subtotalLabel")}</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("discountLabel")}</span>
            <span>-{formatCurrency(discountTotal)}</span>
          </div>
        )}
        {invoice.taxSummary?.taxableAmount ? (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("taxableValueLabel")}</span>
            <span>{formatCurrency(invoice.taxSummary.taxableAmount)}</span>
          </div>
        ) : null}
        {invoice.taxSummary?.components?.length ? (
          invoice.taxSummary.components.map((component) => (
            <div
              key={`${component.type}-${component.rate}`}
              className="flex justify-between text-sm"
            >
              <span className="text-muted-foreground">
                {component.type} {component.rate}%
              </span>
              <span>{formatCurrency(component.amount)}</span>
            </div>
          ))
        ) : (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("taxLabel")}</span>
            <span>{formatCurrency(taxTotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("documentLabel")}</span>
          <span>
            {invoice.taxSummary?.documentTitle ??
              formatTaxInvoiceType(invoice.invoiceType)}
          </span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>{t("totalLabel")}</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
        {amountPaid > 0 ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("amountPaidLabel")}</span>
              <span>{formatCurrency(amountPaid)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">{t("balanceDueLabel")}</span>
              <span>{formatCurrency(balanceDue)}</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
