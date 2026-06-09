"use client";

import type { FC } from "react";
import type { Invoice, Patient } from "@workspace/types";
import { InvoiceBillTo } from "./InvoiceBillTo";
import { InvoiceItemsTableReadOnly } from "./InvoiceItemsTableReadOnly";

type InvoiceLineItemsView = Invoice & { patient?: Patient };

interface InvoiceLineItemsSectionProps {
  invoice: InvoiceLineItemsView;
  formatCurrency: (amount: number) => string;
}

export const InvoiceLineItemsSection: FC<InvoiceLineItemsSectionProps> = ({
  invoice,
  formatCurrency,
}) => {
  return (
    <>
      <InvoiceBillTo invoice={invoice} />
      <InvoiceItemsTableReadOnly
        items={invoice.items || []}
        formatCurrency={formatCurrency}
      />
    </>
  );
};
