"use client";

import { Separator } from "@workspace/ui/components/separator";
import { Invoice, InvoiceItem } from "@workspace/types";

type InvoiceWithExtras = Invoice & {
  discount?: number;
};

interface InvoiceTotalsOnlyProps {
  invoice: InvoiceWithExtras;
  calculateSubtotal: (items: InvoiceItem[]) => number;
  formatCurrency: (amount: number) => string;
  numberToWords: (amount: number) => string;
}

export function InvoiceTotalsOnly({
  invoice,
  calculateSubtotal,
  formatCurrency,
  numberToWords,
}: InvoiceTotalsOnlyProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between gap-6">
      <div className="flex-1">
        <div className="text-sm text-muted-foreground mb-4">
          <p className="font-medium mb-1">Amount in Words:</p>
          <p className="italic">{numberToWords(invoice.totalAmount ?? invoice.total)}</p>
        </div>
        {invoice.notes && (
          <div className="text-sm p-4 bg-muted/30 rounded-lg max-w-md">
            <p className="font-semibold mb-1">Notes:</p>
            <p className="text-muted-foreground">{invoice.notes}</p>
          </div>
        )}
      </div>
      <div className="w-full md:w-64 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(calculateSubtotal(invoice.items || []))}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax (0%)</span>
          <span>{formatCurrency(0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Discount</span>
          <span>
            -
            {formatCurrency(
              invoice.discount || 0,
            )}
          </span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>{formatCurrency(invoice.totalAmount ?? invoice.total)}</span>
        </div>
      </div>
    </div>
  );
}
