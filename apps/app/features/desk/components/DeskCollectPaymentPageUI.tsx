"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDebounce } from "@workspace/hooks/use-debounce";
import {
  type DeskRecordInvoiceSettlementBody,
  type Invoice,
  type UserRole,
} from "@workspace/types";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { DataState } from "@workspace/ui/components/data-state";
import { Section } from "@workspace/ui/components/section";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import { StatusBadge } from "@workspace/ui/components/status-badge";
import { FloatingInput } from "@workspace/ui/components/floating-input";
import { usePatients } from "@/hooks/api/use-patients";
import { useInvoices } from "@/features/invoices/hooks/useInvoices";
import { useDeskRecordInvoiceSettlement } from "@/features/desk/hooks/use-desk-record-invoice-settlement";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { useAuth } from "@/lib/auth-context";
import {
  DATE_FORMAT_OPTIONS_US_LONG,
  formatDate,
} from "@/lib/formatters";
import { ExternalLink } from "lucide-react";

function isOpenDeskInvoice(
  inv: Invoice,
): inv is Invoice & {
  status: "PENDING" | "PARTIALLY_PAID" | "OVERDUE";
} {
  const s = inv.status;
  return s === "PENDING" || s === "PARTIALLY_PAID" || s === "OVERDUE";
}

type DeskPaymentMethod = DeskRecordInvoiceSettlementBody["paymentMethod"];

const PAYMENT_CHANNEL_OPTIONS: {
  value: DeskPaymentMethod;
  label: string;
}[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD_POS", label: "Card (POS / swipe machine)" },
  { value: "UPI_QR", label: "UPI / QR (e.g. PhonePe)" },
  { value: "PINELABS", label: "Pine Labs terminal" },
  { value: "OTHER_TERMINAL", label: "Other card terminal" },
  { value: "OTHER_ONLINE", label: "Other online payment" },
];

const ROLES_CAN_RECORD_PAYMENT: ReadonlySet<UserRole> = new Set([
  "ADMIN",
  "RECEPTIONIST",
  "ADMIN_DOCTOR",
]);

export function DeskCollectPaymentPageUI() {
  const clinicCurrency = useClinicCurrency();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);
  const deferredSearch = useDeferredValue(debouncedSearch);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [dialogInvoice, setDialogInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<DeskPaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const canRecordPayment =
    user?.role !== undefined && ROLES_CAN_RECORD_PAYMENT.has(user.role);

  const {
    data: patientsResponse,
    isLoading: patientsLoading,
    isError: patientsError,
    refetch: refetchPatients,
  } = usePatients({
    limit: 25,
    page: 1,
    search: deferredSearch ? deferredSearch : undefined,
  });

  const {
    data: invoicesRaw,
    isLoading: invoicesLoading,
    isError: invoicesError,
    refetch: refetchInvoices,
  } = useInvoices(
    selectedPatientId
      ? { patientId: selectedPatientId, limit: 50 }
      : undefined,
    { enabled: Boolean(selectedPatientId) },
  );

  const recordSettlement = useDeskRecordInvoiceSettlement();

  const patients = useMemo(
    () => patientsResponse?.items ?? [],
    [patientsResponse],
  );

  const openInvoices = useMemo(() => {
    if (!invoicesRaw?.length) return [];
    return invoicesRaw.filter(isOpenDeskInvoice);
  }, [invoicesRaw]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  useEffect(() => {
    if (!dialogInvoice) return;
    setPaymentMethod("CASH");
    setReference("");
    setNotes("");
  }, [dialogInvoice]);

  const patientsState = patientsLoading
    ? "loading"
    : patientsError
      ? "error"
      : "success";

  const invoicesState =
    selectedPatientId === null
      ? "success"
      : invoicesLoading
        ? "loading"
        : invoicesError
          ? "error"
          : openInvoices.length === 0
            ? "empty"
            : "success";

  const formatMoney = (amount: number | undefined) =>
    clinicCurrency.formatCurrency(amount ?? 0);

  const handleRecordSubmit = async () => {
    if (!dialogInvoice?.id || !canRecordPayment) return;
    await recordSettlement.mutateAsync({
      invoiceId: dialogInvoice.id,
      paymentMethod,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setDialogInvoice(null);
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Payment desk"
          description="Record cash, card terminal, or UPI collections against visit invoices. This desk flow is separate from online payment links and subscription billing."
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/invoices">Open invoice billing</Link>
            </Button>
          }
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
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
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search patients"
              />
              <DataState
                status={patientsState}
                loadingMessage="Loading patients…"
                errorMessage="We could not load patients. Please try again."
                onRetry={() => void refetchPatients()}
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
                            setSelectedPatientId(p.id);
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
                  onRetry={() => void refetchInvoices()}
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
                                  "en-US",
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
                            disabled={
                              !canRecordPayment || recordSettlement.isPending
                            }
                            onClick={() => setDialogInvoice(inv)}
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
                Select a patient on the left to see invoices that can be
                settled at the desk.
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
      </div>

      <Dialog
        open={dialogInvoice !== null}
        onOpenChange={(open) => {
          if (!open) setDialogInvoice(null);
        }}
      >
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
                onValueChange={(v) =>
                  setPaymentMethod(v as DeskPaymentMethod)
                }
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
              onChange={(e) => setReference(e.target.value)}
              autoComplete="off"
            />
            <div className="space-y-2">
              <Label htmlFor="desk-notes" className="text-[var(--fs-xs)]">
                Notes (optional)
              </Label>
              <Textarea
                id="desk-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
              onClick={() => setDialogInvoice(null)}
              disabled={recordSettlement.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleRecordSubmit()}
              disabled={!canRecordPayment || recordSettlement.isPending}
            >
              {recordSettlement.isPending ? "Saving…" : "Confirm desk payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPageScaffold>
  );
}
