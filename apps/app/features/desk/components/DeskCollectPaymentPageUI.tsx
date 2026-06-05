"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { InvoiceListRow } from "@workspace/types";
import Link from "next/link";
import { useDebounce } from "@workspace/hooks/use-debounce";
import {
  isOpenDeskInvoice,
  type DeskPaymentMethod,
  ROLES_CAN_RECORD_PAYMENT,
} from "./desk-collect-payment-helpers";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Button } from "@workspace/ui/components/form/button";
import { usePatients } from "@workspace/data-access";
import { useDeskOpenInvoices } from "@/features/desk/hooks/use-desk-open-invoices";
import { useDeskRecordInvoiceSettlement } from "@/features/desk/hooks/use-desk-record-invoice-settlement";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { useAuth } from "@/lib/auth/auth-context";
import { DeskPatientSearch } from "./DeskPatientSearch";
import { DeskOpenInvoices } from "./DeskOpenInvoices";
import { RecordPaymentDialog } from "./desk-record-payment-dialog";

export function DeskCollectPaymentPageUI() {
  const clinicCurrency = useClinicCurrency();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);
  const deferredSearch = useDeferredValue(debouncedSearch);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [dialogInvoice, setDialogInvoice] = useState<InvoiceListRow | null>(
    null,
  );
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
    data: openInvoicesResponse,
    isLoading: invoicesLoading,
    isError: invoicesError,
    refetch: refetchInvoices,
  } = useDeskOpenInvoices(selectedPatientId, {
    enabled: Boolean(selectedPatientId),
  });

  const recordSettlement = useDeskRecordInvoiceSettlement();

  const patients = useMemo(
    () => patientsResponse?.items ?? [],
    [patientsResponse],
  );

  const openInvoices = useMemo(() => {
    if (!openInvoicesResponse?.items.length) return [];
    return openInvoicesResponse.items.filter(isOpenDeskInvoice);
  }, [openInvoicesResponse]);

  useEffect(() => {
    if (!dialogInvoice) return;
    setPaymentMethod("CASH");
    setReference("");
    setNotes("");
  }, [dialogInvoice]);

  const hasSearchQuery = searchQuery.trim().length > 0;

  const patientsState = patientsLoading
    ? "loading"
    : patientsError
      ? "error"
      : patients.length === 0 && hasSearchQuery
        ? "empty"
        : "success";

  const formatMoney = (amount: number | undefined) =>
    clinicCurrency.formatCurrency(amount ?? 0);

  const handleClearPatient = () => {
    setSelectedPatientId(null);
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSearchQuery("");
  };

  const handleRecordSubmit = async () => {
    if (!dialogInvoice?.id || !canRecordPayment) return;
    await recordSettlement.mutateAsync({
      invoiceId: dialogInvoice.id,
      paymentMethod,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setDialogInvoice(null);
    refetchInvoices();
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Payment desk"
          description="Record cash, card, or UPI payments collected at the front desk against open invoices."
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/invoices">Open invoice billing</Link>
            </Button>
          }
        />
      }
    >
      <div className="space-y-6">
        <DeskPatientSearch
          searchQuery={searchQuery}
          selectedPatientId={selectedPatientId}
          patients={patients}
          patientsState={patientsState}
          onSearchChange={setSearchQuery}
          onSelectPatient={handleSelectPatient}
          onClearPatient={handleClearPatient}
          onRetry={() => void refetchPatients()}
          hasSearchQuery={hasSearchQuery}
        />

        <DeskOpenInvoices
          selectedPatientId={selectedPatientId}
          invoices={openInvoices}
          loading={invoicesLoading}
          error={invoicesError}
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
  );
}
