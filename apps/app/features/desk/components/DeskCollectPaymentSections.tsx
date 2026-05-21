"use client";

import type { Invoice } from "@workspace/types";
import Link from "next/link";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Section } from "@workspace/ui/components/layout/section";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import { FloatingInput } from "@workspace/ui/components/form/floating-input";
import {
  type DeskPaymentMethod,
  PAYMENT_CHANNEL_OPTIONS,
} from "./desk-collect-payment-helpers";
import {
  DATE_FORMAT_OPTIONS_US_LONG,
  formatDate,
} from "@/lib/formatters";
import { ExternalLink } from "lucide-react";

interface DeskPatientListItem {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
}

interface PatientSearchSectionProps {
  searchQuery: string;
  selectedPatientId: string | null;
  patients: DeskPatientListItem[];
  patientsState: "loading" | "error" | "empty" | "success";
  onSearchChange: (value: string) => void;
  onSelectPatient: (patientId: string) => void;
  onRetry: () => void;
}

export function PatientSearchSection({
  searchQuery,
  selectedPatientId,
  patients,
  patientsState,
  onSearchChange,
  onSelectPatient,
  onRetry,
}: PatientSearchSectionProps) {
  return (
    <Section
      title="Find patient"
      description="Search by name. Select a patient to see their open visit invoices."
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[var(--fs-sm)] font-medium">
            Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="search"
            placeholder="Enter patient name"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search patients"
          />
          <DataState
            status={patientsState}
            loadingMessage="Loading patients…"
            errorMessage="We could not load patients. Please try again."
            onRetry={onRetry}
          >
            <ul className="max-h-[min(420px,50vh)] divide-y overflow-y-auto rounded-md border border-border">
              {patients.map((p) => {
                const active = p.id === selectedPatientId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!p.id) return;
                        onSelectPatient(p.id);
                      }}
                      className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted/60 ${
                        active ? "bg-muted/80" : ""
                      }`}
                    >
                      <span className="font-medium text-[var(--fs-sm)]">
                        {p.firstName} {p.lastName}
                      </span>
                      {p.phoneNumber ? (
                        <span className="text-[var(--fs-xs)] text-muted-foreground">
                          {p.phoneNumber}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </DataState>
        </CardContent>
      </Card>
    </Section>
  );
}

interface OpenInvoicesSectionProps {
  selectedPatientId: string | null;
  selectedPatient: DeskPatientListItem | null;
  openInvoices: Invoice[];
  invoicesState: "loading" | "error" | "empty" | "success";
  canRecordPayment: boolean;
  isRecordingPayment: boolean;
  formatMoney: (amount: number | undefined) => string;
  onRetry: () => void;
  onRecordPayment: (invoice: Invoice) => void;
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
          ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
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

interface RecordPaymentDialogProps {
  dialogInvoice: Invoice | null;
  paymentMethod: DeskPaymentMethod;
  reference: string;
  notes: string;
  canRecordPayment: boolean;
  isSaving: boolean;
  formatMoney: (amount: number | undefined) => string;
  onOpenChange: (open: boolean) => void;
  onPaymentMethodChange: (method: DeskPaymentMethod) => void;
  onReferenceChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
}

export function RecordPaymentDialog({
  dialogInvoice,
  paymentMethod,
  reference,
  notes,
  canRecordPayment,
  isSaving,
  formatMoney,
  onOpenChange,
  onPaymentMethodChange,
  onReferenceChange,
  onNotesChange,
  onSubmit,
}: RecordPaymentDialogProps) {
  return (
    <Dialog open={dialogInvoice !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <MicroLabel className="text-muted-foreground">Desk</MicroLabel>
          <DialogTitle>Record desk payment</DialogTitle>
          <DialogDescription>
            {dialogInvoice
              ? `${dialogInvoice.invoiceNumber ? `Invoice #${dialogInvoice.invoiceNumber}` : "Invoice"} · ${formatMoney(dialogInvoice.total ?? dialogInvoice.grandTotal)}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-2">
            <Label htmlFor="desk-channel" className="text-[var(--fs-xs)]">
              Payment method
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => {
                const match = PAYMENT_CHANNEL_OPTIONS.find(
                  (opt) => opt.value === v,
                );
                if (match) onPaymentMethodChange(match.value);
              }}
            >
              <SelectTrigger id="desk-channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_CHANNEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FloatingInput
            id="desk-reference"
            label="Reference or receipt ID (optional)"
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
            autoComplete="off"
          />
          <div className="space-y-2">
            <Label htmlFor="desk-notes" className="text-[var(--fs-xs)]">
              Notes (optional)
            </Label>
            <Textarea
              id="desk-notes"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Enter notes"
              rows={3}
              className="min-h-[80px] resize-y"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canRecordPayment || isSaving}
          >
            {isSaving ? "Saving…" : "Confirm desk payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
