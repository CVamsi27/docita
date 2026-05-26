"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useUpdateInvoice } from "@workspace/data-access";
import { useFormOptions } from "@/lib/contexts/app-config-context";
import { CRUDDialog } from "@workspace/ui/components/overlay/crud-dialog";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Label } from "@workspace/ui/components/form/label";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Plus, X } from "lucide-react";
import { type Invoice, type InvoiceItem, type Patient } from "@workspace/types";
import { z } from "zod";

const editInvoiceStatusSchema = z.enum([
  "PAID",
  "PENDING",
  "OVERDUE",
  "CANCELLED",
  "PARTIALLY_PAID",
]);
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";

type InvoiceWithPatient = Invoice & { patient: Patient };

export interface EditInvoiceDialogProps {
  invoice: InvoiceWithPatient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceUpdated: () => void;
}

export function EditInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onInvoiceUpdated,
}: EditInvoiceDialogProps) {
  const { formatCurrency } = useClinicCurrency();
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
      if (field === "description" && typeof value === "string") {
        item.description = value;
      } else if (field === "quantity" && typeof value === "number") {
        item.quantity = value;
      } else if (field === "price" && typeof value === "number") {
        item.price = value;
      }
    }
    setItems(newItems);
  };

  const calculateTotal = () =>
    items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const handleStatusChange = (nextStatus: string) => {
    const parsed = editInvoiceStatusSchema.safeParse(nextStatus.toUpperCase());
    if (parsed.success) {
      setStatus(parsed.data);
    }
  };

  const handleSubmit = async () => {
    if (!invoice?.id) return;
    setLoading(true);
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
  };

  const patientName = invoice?.patient
    ? `${invoice.patient.firstName} ${invoice.patient.lastName}`
    : "Unknown Patient";

  return (
    <CRUDDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit invoice"
      description={`Update invoice details for ${patientName}`}
      isLoading={loading}
      onSubmit={handleSubmit}
      submitLabel={loading ? "Saving…" : "Save changes"}
      contentClassName="max-w-6xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {invoiceStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Invoice items</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex-1">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                  />
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "quantity",
                        parseInt(e.target.value) || 1,
                      )
                    }
                  />
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "price",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <SymbolTooltip label="Remove line item">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-destructive hover:text-destructive"
                    aria-label="Remove line item"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </SymbolTooltip>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No items. Click &quot;Add Item&quot; to add one.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 p-4 bg-muted/30 rounded-lg">
          <span className="text-lg font-medium">Total:</span>
          <span className="ui-section-title text-[var(--fs-2xl)] text-primary tabular-nums">
            {formatCurrency(calculateTotal(), { currency: invoice?.currency })}
          </span>
        </div>
      </div>
    </CRUDDialog>
  );
}
