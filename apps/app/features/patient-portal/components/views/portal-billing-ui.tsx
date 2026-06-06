"use client";

import { CreditCard } from "lucide-react";
import { ListRow } from "@workspace/ui/components/data-display/list-row";
import { formatCurrency } from "@workspace/utils";
import type { PatientPortalInvoice } from "@/features/patient-portal/types/patient-portal-types";
import { getInvoiceStatusLabel } from "@/features/patient-portal/rules/patient-portal-rules";
import { formatDate } from "@/lib/formatters";
import { PortalCardSection } from "./portal-card-section";

interface PatientPortalBillingUIProps {
  invoices: PatientPortalInvoice[];
  portalHomeHref: string;
  showHeader?: boolean;
}

export function PatientPortalBillingUI({
  invoices,
  portalHomeHref,
  showHeader = true,
}: PatientPortalBillingUIProps) {
  return (
    <PortalCardSection
      pageTitle="Billing"
      pageSubtitle="Review invoice status and pending dues."
      cardTitle="Invoice summary"
      emptyIcon={CreditCard}
      emptyTitle="No invoices available"
      emptyDescription="Your paid and pending invoices will appear here once generated"
      isEmpty={invoices.length === 0}
      portalHomeHref={portalHomeHref}
      showHeader={showHeader}
    >
      {invoices.map((invoice) => (
        <ListRow
          key={invoice.id}
          title={formatCurrency(invoice.amount, {
            currency: invoice.currency,
          })}
          meta={`Invoice #${invoice.id.slice(0, 8)}`}
          time={formatDate(invoice.dueAt)}
          status={invoice.status}
          statusLabel={getInvoiceStatusLabel(invoice.status)}
          showChevron={false}
        />
      ))}
    </PortalCardSection>
  );
}
