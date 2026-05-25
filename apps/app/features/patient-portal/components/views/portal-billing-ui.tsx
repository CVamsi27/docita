"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
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
          <CardTitle>Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No invoices available"
              description="Your paid and pending invoices will appear here once generated"
            />
          ) : (
            <div className="space-y-3 pb-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">
                      {formatCurrency(invoice.amount, {
                        currency: invoice.currency,
                      })}
                    </div>
                    <Badge variant="secondary">
                      {getInvoiceStatusLabel(invoice.status)}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    Invoice #{invoice.id.slice(0, 8)} •{" "}
                    {formatDate(invoice.dueAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-center pb-4">
            <Button asChild variant="outline">
              <Link href={portalHomeHref}>Back to Portal Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
