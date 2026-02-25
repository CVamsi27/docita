"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useUpdateInvoice } from "@/hooks/api/use-billing";
import { useFormOptions } from "@/lib/app-config-context";
import { EditInvoiceDialogUI } from "./EditInvoiceDialogUI";
import type { Invoice, InvoiceItem, Patient } from "@workspace/types";
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
    lastInvoiceIdRef.current = invoice?.id ?? null;
    if (invoice) {
      setItems(invoice.items || []);
      setStatus(invoice.status || "PENDING");
    }
  }
  const addItem = () =>
    setItems([...items, { description: "", quantity: 1, price: 0 }]);
  const removeItem = (index: number) =>
    setItems(items.filter((_, i) => i !== index));
  const updateItem = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number,
  ) => {
    const newItems = [...items];
    const item = newItems[index];
    if (item) {
      if (field === "description") item.description = value as string;
      else if (field === "quantity") item.quantity = value as number;
      else if (field === "price") item.price = value as number;
    }
    setItems(newItems);
  };
  const calculateTotal = () =>
    items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const handleStatusChange = (nextStatus: string) => {
    const normalized = nextStatus.toUpperCase();
    if (
      normalized === "PAID" ||
      normalized === "PENDING" ||
      normalized === "OVERDUE" ||
      normalized === "CANCELLED" ||
      normalized === "PARTIALLY_PAID"
    ) {
      setStatus(normalized);
    }
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
      } catch (error) {
        console.error("Failed to update invoice:", error);
        toast.error("Failed to update invoice");
      } finally {
        setLoading(false);
      }
    })();
  };
  const patientName = invoice?.patient
    ? `${invoice.patient.firstName} ${invoice.patient.lastName}`
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
