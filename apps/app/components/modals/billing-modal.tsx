"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Receipt, Plus, X, CheckCircle2 } from "lucide-react";
import { useInvoiceForm } from "@/hooks/use-invoice-form";
import { useFormOptions } from "@/lib/app-config-context";

interface BillingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  patientId: string;
  patientName?: string;
  onSaved?: () => void;
}

export function BillingModal({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  patientName,
  onSaved,
}: BillingModalProps) {
  const invoiceStatusOptions = useFormOptions("invoiceStatus");

  const {
    loading,
    status: invStatus,
    setStatus: setInvStatus,
    items: invoiceItems,
    addItem,
    removeItem: removeInvoiceItem,
    updateItem: updateInvoiceItem,
    calculateTotal: calculateInvTotal,
    handleSubmit,
  } = useInvoiceForm({
    appointmentId,
    patientId,
    onInvoiceCreated: async () => {
      if (onSaved) {
        await onSaved();
      }
      setTimeout(() => onOpenChange(false), 100);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Receipt className="h-5 w-5 text-purple-600" />
            Billing / Invoice
            {patientName && (
              <span className="text-muted-foreground font-normal">
                - {patientName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }}
          className="space-y-6 py-4"
        >
          {/* Header with Status and Add Button */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Invoice Items</Label>
              <p className="text-sm text-muted-foreground">
                Add services and costs
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={invStatus} onValueChange={setInvStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {invoiceStatusOptions
                    .filter((opt) => opt.value !== "cancelled")
                    .map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem()}
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="space-y-3">
            {invoiceItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 border rounded-lg bg-card group"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-6 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Description
                    </Label>
                    <Input
                      placeholder="Service description"
                      value={item.description}
                      onChange={(e) =>
                        updateInvoiceItem(index, "description", e.target.value)
                      }
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateInvoiceItem(
                          index,
                          "quantity",
                          parseInt(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Price (₹)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) =>
                        updateInvoiceItem(
                          index,
                          "price",
                          parseFloat(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end justify-end pb-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInvoiceItem(index)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {invoiceItems.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                No items added. Click &quot;Add Item&quot; to start.
              </div>
            )}
          </div>

          {/* Total */}
          <div className="flex items-center justify-end gap-4 p-4 bg-muted/10 rounded-lg">
            <span className="text-lg font-medium">Total Amount:</span>
            <span className="text-2xl font-bold text-primary">
              ₹{calculateInvTotal().toFixed(2)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                "Creating..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Create Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
