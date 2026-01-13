import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";
import { CreditCard, Plus, X } from "lucide-react";
import { ModalProps } from "./PrescriptionModal";

export interface LineItem {
  description: string;
  quantity: number;
  price: number;
}

export function BillingModal({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  onSaved,
}: ModalProps) {
  const [items, setItems] = useState<LineItem[]>([
    { description: "Consultation Fee", quantity: 1, price: 50 },
  ]);
  const [dueDate, setDueDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  const createInvoice = apiHooks.useCreateInvoice();

  const handleSave = async () => {
    try {
      if (!appointmentId || !patientId) return;

      const validItems = items.filter((i) => i.description.trim() !== "");

      if (validItems.length === 0) {
        toast.error("Please add at least one line item");
        return;
      }

      await createInvoice.mutateAsync({
        patientId,
        appointmentId,
        items: validItems,
        notes: "Generated from consultation",
        status: "pending",
        total: items.reduce((sum, item) => sum + item.quantity * item.price, 0),
      });

      toast.success("Invoice created");
      onSaved?.();
      onOpenChange?.(false);
      setItems([{ description: "Consultation Fee", quantity: 1, price: 50 }]);
    } catch (err) {
      toast.error("Failed to create invoice");
      console.error(err);
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, price: 0 }]);
  };

  const updateItem = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Create Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-end mb-2">
            <div className="flex items-center gap-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground p-2">
              <div className="col-span-6">Description</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-3">Unit Price</div>
              <div className="col-span-1"></div>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <Input
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(index, "price", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="col-span-1">
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={addItem}
            className="w-full border-dashed mt-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Line Item
          </Button>

          <div className="flex justify-end pt-4 border-t">
            <div className="text-right">
              <span className="text-sm text-muted-foreground mr-4">Total Amount:</span>
              <span className="text-xl font-bold">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createInvoice.isPending}>
            {createInvoice.isPending ? "Generating..." : "Generate Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
