"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import { ExternalLink, Receipt } from "lucide-react";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { formatCurrency, formatDate } from "@workspace/utils";
import { useInvoices } from "@/hooks/api/use-billing";

interface BillingTabProps {
  patientId: string;
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PAID: "default",
  PENDING: "outline",
  PARTIALLY_PAID: "secondary",
  OVERDUE: "destructive",
  CANCELLED: "destructive",
};

export function BillingTab({ patientId }: BillingTabProps) {
  const { data: invoices, isLoading, isError, refetch } = useInvoices({
    patientId,
  });

  if (isLoading) {
    return <DataState status="loading" loadingMessage="Loading invoices…" />;
  }

  if (isError) {
    return (
      <DataState
        status="error"
        errorMessage="We could not load these invoices. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <DataState
        status="empty"
        emptyIcon={Receipt}
        emptyTitle="No invoices yet"
        emptyDescription="Invoices billed to this patient will appear here."
      />
    );
  }

  const sorted = [...invoices].sort((a, b) => {
    const aDate = new Date(a.issuedAt ?? a.createdAt).getTime();
    const bDate = new Date(b.issuedAt ?? b.createdAt).getTime();
    return bDate - aDate;
  });

  return (
    <div className="space-y-3">
      {sorted.map((invoice) => {
        const issuedDate = invoice.issuedAt ?? invoice.createdAt;
        const dateLabel = issuedDate
          ? formatDate(issuedDate, "EEE, d MMM yyyy")
          : "";
        const grandTotal = invoice.grandTotal ?? invoice.total ?? 0;
        const variant = STATUS_VARIANT[invoice.status] ?? "outline";

        return (
          <Card key={invoice.id ?? invoice.invoiceNumber}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    {invoice.invoiceNumber
                      ? `#${invoice.invoiceNumber}`
                      : "Invoice"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dateLabel}
                    {invoice.appointment?.doctor?.name
                      ? ` \u00b7 Dr. ${invoice.appointment.doctor.name}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(grandTotal, {
                      currency: invoice.currency,
                      fractionDigits: 2,
                    })}
                  </span>
                  <Badge variant={variant} className="text-xs">
                    {humanizeUiLabel(invoice.status)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            {invoice.id && (
              <CardContent>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  <Link href={`/invoices/${invoice.id}`}>
                    <ExternalLink className="h-3 w-3 mr-1.5" />
                    View invoice
                  </Link>
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
