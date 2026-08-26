import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { InvoiceListRow } from "@workspace/types";
import { invoiceBalanceDue } from "@workspace/types";
import { Link } from "react-router";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { isOpenDeskInvoice, type DeskPaymentMethod, ROLES_CAN_RECORD_PAYMENT } from "./desk-collect-payment-helpers";
import { AppPageScaffold, Button, PageHeader } from "@workspace/ui/components";
import { usePatients } from "@workspace/data-access";
import { useDeskOpenInvoices } from "@/features/desk/hooks/use-desk-open-invoices";
import { useDeskRecordInvoiceSettlement } from "@/features/desk/hooks/use-desk-record-invoice-settlement";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { formatCurrency } from "@/lib/formatters";
import { useAuth } from "@/lib/auth/auth-context";
import { DeskPatientSearch } from "./DeskPatientSearch";
import { DeskOpenInvoices } from "./DeskOpenInvoices";
import { RecordPaymentDialog } from "./desk-record-payment-dialog";
import { DeskCollectionsByModeReport } from "./DeskCollectionsByModeReport";

export function DeskCollectPaymentPageUI() {
  const { currency } = useLocaleCurrency();
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
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const balanceDue = dialogInvoice ? invoiceBalanceDue(dialogInvoice) : 0;

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
    setAmount(invoiceBalanceDue(dialogInvoice).toFixed(2));
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
    formatCurrency(amount ?? 0, currency);

  const handleClearPatient = () => {
    setSelectedPatientId(null);
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSearchQuery("");
  };

  const parsedAmount = Number.parseFloat(amount);
  const amountIsValid =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= balanceDue + 0.001;

  const handleRecordSubmit = async () => {
    if (!dialogInvoice?.id || !canRecordPayment || !amountIsValid) return;
    try {
      await recordSettlement.mutateAsync({
        invoiceId: dialogInvoice.id,
        paymentMethod,
        amount: Math.round(parsedAmount * 100) / 100,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setDialogInvoice(null);
      refetchInvoices();
    } catch {
      // Failure toast is raised by the settlement hook; keep the dialog open
      // so the front-desk user can correct and retry.
    }
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Payment desk"
          description="Record cash, card, or UPI payments collected at the front desk against open invoices."
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/invoices">Open invoice billing</Link>
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

        <DeskCollectionsByModeReport formatMoney={formatMoney} />
      </div>

      <RecordPaymentDialog
        dialogInvoice={dialogInvoice}
        paymentMethod={paymentMethod}
        amount={amount}
        balanceDue={balanceDue}
        amountIsValid={amountIsValid}
        reference={reference}
        notes={notes}
        canRecordPayment={canRecordPayment && amountIsValid}
        isSaving={recordSettlement.isPending}
        formatMoney={formatMoney}
        onOpenChange={(open) => {
          if (!open && !recordSettlement.isPending) setDialogInvoice(null);
        }}
        onPaymentMethodChange={setPaymentMethod}
        onAmountChange={setAmount}
        onReferenceChange={setReference}
        onNotesChange={setNotes}
        onSubmit={() => void handleRecordSubmit()}
      />
    </AppPageScaffold>
  );
}
