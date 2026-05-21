"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { formatCurrency, parseStringEnumMember } from "@workspace/utils";

const BILLING_DISCOUNT_TYPE_VALUES = ["PERCENTAGE", "AMOUNT"] as const;
import { toast } from "sonner";
import { useCreateInvoice } from "@/hooks/api/use-billing";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { CreditCard } from "lucide-react";
import { ModalProps } from "./PrescriptionModal";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useDefaultValue } from "@/lib/contexts/app-config-context";
import { BillingLineItemsEditor } from "./BillingLineItemsEditor";

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
  const defaultConsultationFee = useDefaultValue("consultationFee");
  const [hasCustomizedDefaultFee, setHasCustomizedDefaultFee] = useState(false);
  const [items, setItems] = useState<LineItem[]>(() => [
    { description: "Consultation Fee", quantity: 1, price: defaultConsultationFee },
  ]);
  const [dueDate, setDueDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "AMOUNT">(
    "AMOUNT",
  );
  const [paymentMode, setPaymentMode] = useState<string>("CASH");

  const createInvoice = useCreateInvoice();
  const { currency } = useLocaleCurrency();

  useEffect(() => {
    if (hasCustomizedDefaultFee) {
      return;
    }

    setItems((prev) => {
      if (prev.length !== 1) return prev;
      const first = prev[0];
      if (!first || first.description !== "Consultation Fee") return prev;
      if (first.quantity !== 1) return prev;
      if (first.price === defaultConsultationFee) return prev;
      return [{ ...first, price: defaultConsultationFee }];
    });
  }, [defaultConsultationFee, hasCustomizedDefaultFee]);

  const fmt = (n: number) =>
    formatCurrency(n, { currency, fractionDigits: 2 });

  const calculations = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
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
        showUserFacingErrorToast(
          "Add at least one billing item before saving the invoice",
        );
        return;
      }

      if (calculations.discountAmount > calculations.subtotal) {
        showUserFacingErrorToast("Discount cannot exceed the subtotal");
        return;
      }

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
        status: "PENDING",
        total: Number(calculations.total.toFixed(2)),
      });

      toast.success("Invoice created");
      onSaved?.();
      onOpenChange?.(false);

      setItems([
        {
          description: "Consultation Fee",
          quantity: 1,
          price: defaultConsultationFee,
        },
      ]);
      setHasCustomizedDefaultFee(false);
      setTaxRate(0);
      setDiscountValue(0);
    } catch {
      showUserFacingErrorToast(
        "We could not create the invoice. Please try again.",
      );

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
    if (
      index === 0 &&
      newItems[index]?.description === "Consultation Fee" &&
      field === "price"
    ) {
      setHasCustomizedDefaultFee(true);
    }
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-success" />
            Create Invoice
          </DialogTitle>
          <DialogDescription>
            Add billable line items and set a due date.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 min-w-0">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Line Items
            </div>
            <div className="flex items-center gap-2">
              <Label>Due Date</Label>
              <DatePicker
                value={dueDate}
                onChange={(date) =>
                  setDueDate(date?.toISOString().slice(0, 10) ?? "")
                }
                placeholder="Due date"
                className="w-40 h-8"
              />
            </div>
          </div>

          <BillingLineItemsEditor
            items={items}
            updateItem={updateItem}
            removeItem={removeItem}
            addItem={addItem}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                    onValueChange={(v) => {
                      const parsed = parseStringEnumMember(
                        BILLING_DISCOUNT_TYPE_VALUES,
                        v,
                      );
                      if (parsed) setDiscountType(parsed);
                    }}
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
                    <SelectValue placeholder="Payment mode" />
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

            <div className="bg-muted/50 rounded-lg p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{fmt(calculations.subtotal)}</span>
              </div>
              {calculations.taxAmount > 0 && (
                <div className="flex justify-between text-sm text-warning">
                  <span>Tax ({taxRate}%)</span>
                  <span>+{fmt(calculations.taxAmount)}</span>
                </div>
              )}
              {calculations.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount</span>
                  <span>-{fmt(calculations.discountAmount)}</span>
                </div>
              )}
              <div className="border-t pt-3 mt-2 flex justify-between items-center">
                <span className="font-semibold">Grand Total</span>
                <span className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {fmt(calculations.total)}
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
            {createInvoice.isPending ? "Generating…" : "Generate Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
