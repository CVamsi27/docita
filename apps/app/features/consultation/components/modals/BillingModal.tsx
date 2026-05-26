"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { DatePicker } from "@workspace/ui/components/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { formatCurrency } from "@workspace/utils";
import { CreditCard } from "lucide-react";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { CreditCard } from "lucide-react";
import { ModalProps } from "./PrescriptionModal";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useDefaultValue } from "@/lib/contexts/app-config-context";
import { BillingLineItemsEditor } from "./BillingLineItemsEditor";

export type { LineItem } from "./billing-modal-types";

export function BillingModal({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  onSaved,
}: ModalProps) {
  const { currency } = useLocaleCurrency();
  const billing = useBillingModal({
    appointmentId,
    patientId,
    onSaved,
    onOpenChange,
  });

  const fmt = (n: number) =>
    formatCurrency(n, { currency, fractionDigits: 2 });

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
                value={billing.dueDate}
                onChange={(date) =>
                  billing.setDueDate(date?.toISOString().slice(0, 10) ?? "")
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
                    onValueChange={(v) =>
                      setDiscountType(v as "PERCENTAGE" | "AMOUNT")
                    }
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
            onClick={billing.handleSave}
            disabled={billing.createInvoice.isPending}
            className="w-32"
          >
            {billing.createInvoice.isPending ? "Generating…" : "Generate Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
