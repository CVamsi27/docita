"use client";

import { getPatientFullName } from "@workspace/utils";

import type { InvoiceListRow } from "@workspace/types";
import Link from "next/link";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Section } from "@workspace/ui/components/layout/section";
import { Button } from "@workspace/ui/components/form/button";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import { DATE_FORMAT_OPTIONS_US_LONG, formatDate } from "@/lib/formatters";
import { ExternalLink } from "lucide-react";

interface DeskPatientListItem {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface OpenInvoicesSectionProps {
  selectedPatientId: string | null;
  selectedPatient: DeskPatientListItem | null;
  openInvoices: InvoiceListRow[];
  invoicesState: "loading" | "error" | "empty" | "success";
  canRecordPayment: boolean;
  isRecordingPayment: boolean;
  formatMoney: (amount: number | undefined) => string;
  onRetry: () => void;
  onRecordPayment: (invoice: InvoiceListRow) => void;
}

export function OpenInvoicesSection({
  selectedPatientId,
  selectedPatient,
  openInvoices,
  invoicesState,
  canRecordPayment,
  isRecordingPayment,
  formatMoney,
  onRetry,
  onRecordPayment,
}: OpenInvoicesSectionProps) {
  return (
    <Section
      title="Open visit invoices"
      description={
        selectedPatient
          ? getPatientFullName(selectedPatient)
          : "Select a patient to load invoices."
      }
    >
      {selectedPatientId ? (
        <Card>
          <CardContent className="pt-6">
            <DataState
              status={invoicesState}
              loadingMessage="Loading invoices…"
              errorMessage="We could not load invoices. Please try again."
              onRetry={onRetry}
              emptyTitle="No open invoices"
              emptyDescription="This patient has no pending, partially paid, or overdue invoices."
            >
              <div className="space-y-3">
                {openInvoices.map((inv) => (
                  <div
                    key={inv.id ?? inv.invoiceNumber}
                    className="ui-card-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[var(--fs-sm)]">
                          {inv.invoiceNumber
                            ? `#${inv.invoiceNumber}`
                            : inv.id
                              ? `Invoice ${inv.id.slice(0, 8)}`
                              : "Invoice"}
                        </span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <p className="text-[var(--fs-xs)] text-muted-foreground">
                        {inv.createdAt
                          ? formatDate(
                              inv.createdAt,
                              DATE_FORMAT_OPTIONS_US_LONG,
                            )
                          : ""}
                        {" · "}
                        {formatMoney(inv.total ?? inv.grandTotal)}
                      </p>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="inline-flex items-center gap-1 text-[var(--fs-xs)] text-primary hover:underline"
                      >
                        View in invoice billing
                        <ExternalLink className="size-3" aria-hidden />
                      </Link>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={!canRecordPayment || isRecordingPayment}
                        onClick={() => onRecordPayment(inv)}
                      >
                        Record desk payment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </DataState>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-[var(--fs-sm)] text-muted-foreground">
            Select a patient on the left to see invoices that can be settled at
            the desk.
          </CardContent>
        </Card>
      )}
      {!canRecordPayment ? (
        <p className="mt-3 text-[var(--fs-xs)] text-muted-foreground">
          Desk payment recording is limited to admin, admin-doctor, and
          reception roles. You can still review invoices.
        </p>
      ) : null}
    </Section>
  );
}
