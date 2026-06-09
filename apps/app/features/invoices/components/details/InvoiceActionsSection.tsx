"use client";

import type { FC } from "react";
import { Section } from "@workspace/ui/components/layout/section";
import { InvoicePaymentActivitySection } from "./InvoicePaymentActivitySection";

interface InvoiceActionsSectionProps {
  invoiceId: string;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString?: Date | string) => string;
}

export const InvoiceActionsSection: FC<InvoiceActionsSectionProps> = ({
  invoiceId,
  formatCurrency,
  formatDate,
}) => {
  return (
    <Section
      id="invoice-payment-activity"
      className="print:hidden"
      title="Payment activity"
      description="Payment links, online sessions, and desk settlements recorded for this invoice."
    >
      <InvoicePaymentActivitySection
        invoiceId={invoiceId}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />
    </Section>
  );
};
