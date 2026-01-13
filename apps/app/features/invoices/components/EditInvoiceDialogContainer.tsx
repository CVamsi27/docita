"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";
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
  const [status, setStatus] = useState<string>(
    () => invoice?.status || "pending",
  );
  const [loading, setLoading] = useState(false);
  const invoiceStatusOptions = useFormOptions("invoiceStatus");
  const updateInvoiceMutation = apiHooks.useUpdateInvoice(invoice?.id || "");
  // Sync state when invoice changes
  if (invoice?.id !== lastInvoiceIdRef.current) {
    lastInvoiceIdRef.current = invoice?.id ?? null;
    if (invoice) {
      setItems(invoice.items || []);
      setStatus(invoice.status || "pending");
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
  const handleSubmit = () => {
    if (!invoice?.id) return;
    setLoading(true);
    (async () => {
      try {
        await updateInvoiceMutation.mutateAsync({
          items,
          status: status as
            | "pending"
            | "paid"
            | "cancelled"
            | "overdue"
            | undefined,
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
      onStatusChange={setStatus}
      onAddItem={addItem}
      onRemoveItem={removeItem}
      onUpdateItem={updateItem}
      onSubmit={handleSubmit}
      calculateTotal={calculateTotal}
    />
  );
}

// Alias for import compatibility
export { EditInvoiceDialogContainer as EditInvoiceDialog };
