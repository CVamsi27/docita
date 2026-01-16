import React, { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "sonner";
import { useCreateInvoice } from "@/hooks/api/use-billing";
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
    new Date().toISOString().split("T")[0]
  );

  // New fields for Tax, Discount, Payment Mode
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "AMOUNT">(
    "AMOUNT"
  );
  const [paymentMode, setPaymentMode] = useState<string>("CASH");

  const createInvoice = useCreateInvoice();

  // Calculations
  const calculations = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    const taxAmount = subtotal * (taxRate / 100);

    let discountAmount = 0;
    if (discountType === "PERCENTAGE") {
      discountAmount = subtotal * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }

    const total = Math.max(0, subtotal + taxAmount - discountAmount);

    return { subtotal, taxAmount, discountAmount, total };
  }, [items, taxRate, discountValue, discountType]);

  const handleSave = async () => {
    try {
      if (!appointmentId || !patientId) return;

      const validItems = items.filter((i) => i.description.trim() !== "");

      if (validItems.length === 0) {
        toast.error("Please add at least one line item");
        return;
      }

      // Prepare items including tax and discount for persistent storage
      // Since backend doesn't support separate tax/discount fields yet, we add them as items
      const finalItems = [...validItems];

      if (calculations.taxAmount > 0) {
        finalItems.push({
          description: `Tax (${taxRate}%)`,
          quantity: 1,
          price: Number(calculations.taxAmount.toFixed(2)),
        });
      }

      if (calculations.discountAmount > 0) {
        finalItems.push({
          description: `Discount (${discountType === "PERCENTAGE" ? `${discountValue}%` : "Flat"})`,
          quantity: 1,
          price: -Number(calculations.discountAmount.toFixed(2)),
        });
      }

      await createInvoice.mutateAsync({
        patientId,
        appointmentId,
        items: finalItems,
        notes: `Generated from consultation. Payment Mode: ${paymentMode}`,
        status: "pending",
        total: Number(calculations.total.toFixed(2)),
      });

      toast.success("Invoice created");
      onSaved?.();
      onOpenChange?.(false);
      // Reset form
      setItems([{ description: "Consultation Fee", quantity: 1, price: 50 }]);
      setTaxRate(0);
      setDiscountValue(0);
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
    value: string | number
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Create Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium">Line Items</div>
            <div className="flex items-center gap-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-40 h-8"
              />
            </div>
          </div>

          <div className="space-y-3 bg-muted/20 p-4 rounded-lg">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-4">Unit Price</div>
              <div className="col-span-1"></div>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Input
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    className="h-9"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "quantity",
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="h-9"
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "price",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="h-9"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={addItem}
              className="w-full border-dashed mt-2"
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>

          {/* Adjustments & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Tax / VAT
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) =>
                      setTaxRate(parseFloat(e.target.value) || 0)
                    }
                    className="w-24"
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Discount
                </Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={discountType}
                    onValueChange={(v: any) => setDiscountType(v)}
                  >
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AMOUNT">Flat</SelectItem>
                      <SelectItem value="PERCENTAGE">%</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) =>
                      setDiscountValue(parseFloat(e.target.value) || 0)
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Payment Mode
                </Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="UPI">UPI / GPay</SelectItem>
                    <SelectItem value="INSURANCE">Insurance</SelectItem>
                    <SelectItem value="ONLINE">Online Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right: Summary */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${calculations.subtotal.toFixed(2)}</span>
              </div>
              {calculations.taxAmount > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Tax ({taxRate}%)</span>
                  <span>+${calculations.taxAmount.toFixed(2)}</span>
                </div>
              )}
              {calculations.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-${calculations.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-3 mt-2 flex justify-between items-center">
                <span className="font-semibold">Grand Total</span>
                <span className="text-2xl font-bold">
                  ${calculations.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createInvoice.isPending}
            className="w-32"
          >
            {createInvoice.isPending ? "Generating..." : "Generate Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
