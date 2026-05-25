"use client";

import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { parseStringEnumMember } from "@workspace/utils";

interface BillingModalSummaryPanelProps {
  taxRate: number;
  setTaxRate: (value: number) => void;
  discountValue: number;
  setDiscountValue: (value: number) => void;
  discountType: "PERCENTAGE" | "AMOUNT";
  setDiscountType: (value: "PERCENTAGE" | "AMOUNT") => void;
  discountTypeValues: readonly ["PERCENTAGE", "AMOUNT"];
  paymentMode: string;
  setPaymentMode: (value: string) => void;
  calculations: {
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
  };
  formatAmount: (amount: number) => string;
}

export function BillingModalSummaryPanel({
  taxRate,
  setTaxRate,
  discountValue,
  setDiscountValue,
  discountType,
  setDiscountType,
  discountTypeValues,
  paymentMode,
  setPaymentMode,
  calculations,
  formatAmount,
}: BillingModalSummaryPanelProps) {
  return (
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
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
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
                const parsed = parseStringEnumMember(discountTypeValues, v);
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
          <span>{formatAmount(calculations.subtotal)}</span>
        </div>
        {calculations.taxAmount > 0 ? (
          <div className="flex justify-between text-sm text-warning">
            <span>Tax ({taxRate}%)</span>
            <span>+{formatAmount(calculations.taxAmount)}</span>
          </div>
        ) : null}
        {calculations.discountAmount > 0 ? (
          <div className="flex justify-between text-sm text-success">
            <span>Discount</span>
            <span>-{formatAmount(calculations.discountAmount)}</span>
          </div>
        ) : null}
        <div className="border-t pt-3 mt-2 flex justify-between items-center">
          <span className="font-semibold">Grand Total</span>
          <span className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {formatAmount(calculations.total)}
          </span>
        </div>
      </div>
    </div>
  );
}
