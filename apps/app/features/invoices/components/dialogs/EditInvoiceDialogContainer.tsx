"use client";

import { getPatientFullName } from "@workspace/utils";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useUpdateInvoice } from "@workspace/data-access";
import { useFormOptions } from "@/lib/contexts/app-config-context";
import { EditInvoiceDialogUI } from "./EditInvoiceDialogUI";
import type { Invoice, InvoiceItem, Patient } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  calculateInvoiceTotal,
  createBlankInvoiceItem,
  parseInvoiceStatus,
  removeInvoiceItem,
  updateInvoiceItems,
  type EditableInvoiceItemField,
} from "./edit-invoice-dialog-state";

type InvoiceWithPatient = Invoice & { patient: Patient };

interface EditInvoiceDialogContainerProps {
  invoice: InvoiceWithPatient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceUpdated: () => void;
}
export function EditInvoiceDialogContainer({
  invoice,
  open,
  onOpenChange,
  onInvoiceUpdated,
// jscpd:ignore-start
}: EditInvoiceDialogContainerProps) {
  const lastInvoiceIdRef = useRef<string | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>(() => invoice?.items || []);
  const [status, setStatus] = useState<Invoice["status"]>(
    () => invoice?.status || "PENDING",
  );
  const [loading, setLoading] = useState(false);
  const invoiceStatusOptions = useFormOptions("invoiceStatus");
  const updateInvoiceMutation = useUpdateInvoice(invoice?.id || "");
  if (invoice?.id !== lastInvoiceIdRef.current) {
// jscpd:ignore-end
    lastInvoiceIdRef.current = invoice?.id ?? null;
    if (invoice) {
      setItems(invoice.items || []);
      setStatus(invoice.status || "PENDING");
    }
  }
  const addItem = () =>
    setItems((currentItems) => [...currentItems, createBlankInvoiceItem()]);
  const removeItem = (index: number) =>
    setItems((currentItems) => removeInvoiceItem(currentItems, index));
  const updateItem = (
    index: number,
    field: EditableInvoiceItemField,
    value: string | number,
  ) =>
    setItems((currentItems) =>
      updateInvoiceItems(currentItems, index, field, value),
    );
  const calculateTotal = () => calculateInvoiceTotal(items);
  const handleStatusChange = (nextStatus: string) => {
    const nextInvoiceStatus = parseInvoiceStatus(nextStatus);
    if (nextInvoiceStatus) setStatus(nextInvoiceStatus);
  };
  const handleSubmit = () => {
    if (!invoice?.id) return;
    setLoading(true);
    (async () => {
      try {
        await updateInvoiceMutation.mutateAsync({
          items,
          status,
          total: calculateTotal(),
        });
        toast.success("Invoice updated successfully");
        onInvoiceUpdated();
        setTimeout(() => onOpenChange(false), 100);
      } catch {
        showUserFacingErrorToast(
          "We could not save this invoice. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    })();
  };
  const patientName = invoice?.patient
    ? getPatientFullName(invoice.patient)
    : "Unknown Patient";
  return (
    <EditInvoiceDialogUI
      open={open}
      patientName={patientName}
      items={items}
      status={status}
      loading={loading}
      statusOptions={invoiceStatusOptions}
      onOpenChange={onOpenChange}
      onStatusChange={handleStatusChange}
      onAddItem={addItem}
      onRemoveItem={removeItem}
      onUpdateItem={updateItem}
      onSubmit={handleSubmit}
      calculateTotal={calculateTotal}
    />
  );
}

export { EditInvoiceDialogContainer as EditInvoiceDialog };
