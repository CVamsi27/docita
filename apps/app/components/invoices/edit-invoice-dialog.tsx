"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CRUDDialog } from "@workspace/ui/components/crud-dialog";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Plus, X } from "lucide-react";
import { apiHooks } from "@/lib/api-hooks";
import { useFormOptions } from "@/lib/app-config-context";
import type { Invoice, InvoiceItem, Patient } from "@workspace/types";

type InvoiceWithPatient = Invoice & { patient: Patient };

interface EditInvoiceDialogProps {
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
  const lastInvoiceIdRef = useRef<string | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>(() => invoice?.items || []);
  const [status, setStatus] = useState<
    "pending" | "paid" | "overdue" | "cancelled"
  >(
    () =>
      (invoice?.status as "pending" | "paid" | "overdue" | "cancelled") ||
      "pending",
  );
  const [loading, setLoading] = useState(false);

  // Get form options from config
  const invoiceStatusOptions = useFormOptions("invoiceStatus");

  const updateInvoiceMutation = apiHooks.useUpdateInvoice(invoice?.id || "");

  // Sync state when invoice changes (without useEffect)
  if (invoice?.id !== lastInvoiceIdRef.current) {
    lastInvoiceIdRef.current = invoice?.id ?? null;
    if (invoice) {
      setItems(invoice.items || []);
      setStatus(
        (invoice.status as "pending" | "paid" | "overdue" | "cancelled") ||
          "pending",
      );
    }
  }

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number,
  ) => {
    const newItems = [...items];
    const item = newItems[index];
    if (item) {
      if (field === "description") {
        item.description = value as string;
      } else if (field === "quantity") {
        item.quantity = value as number;
      } else if (field === "price") {
        item.price = value as number;
      }
    }
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
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

  return (
    <CRUDDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Invoice"
      description={`Update invoice details for ${invoice?.patient?.firstName} ${invoice?.patient?.lastName}`}
      isLoading={loading}
      onSubmit={handleSubmit}
      submitLabel={loading ? "Saving..." : "Save Changes"}
      contentClassName="max-w-6xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) =>
              setStatus(v as "pending" | "paid" | "overdue" | "cancelled")
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select status" />
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

        {/* Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Invoice Items</Label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No items. Click &quot;Add Item&quot; to add one.
              </div>
            )}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-end gap-4 p-4 bg-muted/30 rounded-lg">
          <span className="text-lg font-medium">Total:</span>
          <span className="text-2xl font-bold text-primary">
            ₹{calculateTotal().toFixed(2)}
          </span>
        </div>
      </div>
    </CRUDDialog>
  );
}
