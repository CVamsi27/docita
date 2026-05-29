"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import {
  ListRow,
  ListRowGroup,
} from "@workspace/ui/components/data-display/list-row";
import { formatCurrency } from "@workspace/utils";
import type { PatientPortalInvoice } from "@/features/patient-portal/types/patient-portal-types";
import { getInvoiceStatusLabel } from "@/features/patient-portal/rules/patient-portal-rules";
import { formatDate } from "@/lib/formatters";

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
    <div className="space-y-4">
      {showHeader ? (
        <div>
          <h1 className="ui-page-title">Billing</h1>
          <p className="ui-page-subtitle">
            Review invoice status and pending dues.
          </p>
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Invoice summary</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No invoices available"
              description="Your paid and pending invoices will appear here once generated"
            />
          ) : (
            <div className="ui-card-surface overflow-hidden rounded-[var(--radius-md)] border border-border/70 pb-4">
              <ListRowGroup>
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
              </ListRowGroup>
            </div>
          )}
          <div className="flex justify-center pb-4 pt-4">
            <Button asChild variant="outline" className="touch-manipulation">
              <Link href={portalHomeHref}>Back to Portal Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
