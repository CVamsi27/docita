"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { Invoice } from "@workspace/types";
import Link from "next/link";
import { useDebounce } from "@workspace/hooks/use-debounce";
import {
  isOpenDeskInvoice,
  type DeskPaymentMethod,
  PAYMENT_CHANNEL_OPTIONS,
  ROLES_CAN_RECORD_PAYMENT,
} from "./desk-collect-payment-helpers";
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
import { useInvoices } from "@/features/invoices";
import { useDeskRecordInvoiceSettlement } from "@/features/desk/hooks/use-desk-record-invoice-settlement";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { useAuth } from "@/lib/auth/auth-context";
import {
  OpenInvoicesSection,
  PatientSearchSection,
  RecordPaymentDialog,
} from "./DeskCollectPaymentSections";


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
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
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
        <PatientSearchSection
          searchQuery={searchQuery}
          selectedPatientId={selectedPatientId}
          patients={patients}
          patientsState={patientsState}
          onSearchChange={setSearchQuery}
          onSelectPatient={setSelectedPatientId}
          onRetry={() => void refetchPatients()}
        />

        <OpenInvoicesSection
          selectedPatientId={selectedPatientId}
          selectedPatient={selectedPatient}
          openInvoices={openInvoices}
          invoicesState={invoicesState}
          canRecordPayment={canRecordPayment}
          isRecordingPayment={recordSettlement.isPending}
          formatMoney={formatMoney}
          onRetry={() => void refetchInvoices()}
          onRecordPayment={setDialogInvoice}
        />
      </div>

      <RecordPaymentDialog
        dialogInvoice={dialogInvoice}
        paymentMethod={paymentMethod}
        reference={reference}
        notes={notes}
        canRecordPayment={canRecordPayment}
        isSaving={recordSettlement.isPending}
        formatMoney={formatMoney}
        onOpenChange={(open) => {
          if (!open) setDialogInvoice(null);
        }}
        onPaymentMethodChange={setPaymentMethod}
        onReferenceChange={setReference}
        onNotesChange={setNotes}
        onSubmit={() => void handleRecordSubmit()}
      />
    </AppPageScaffold>
    </FeatureGate>
  );
}
