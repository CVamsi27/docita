"use client";

// jscpd:ignore-start
import type { InvoiceListRow } from "@workspace/types";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@workspace/ui/components/form/form-primitives";
import { Button, Label, MicroLabel } from "@workspace/ui/components";
import {
  Dialog,
  // jscpd:ignore-end
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import {
  type DeskPaymentMethod,
  PAYMENT_CHANNEL_OPTIONS,
} from "./desk-collect-payment-helpers";

export interface RecordPaymentDialogProps {
  dialogInvoice: InvoiceListRow | null;
  paymentMethod: DeskPaymentMethod;
  amount: string;
  balanceDue: number;
  amountIsValid: boolean;
  reference: string;
  notes: string;
  canRecordPayment: boolean;
  isSaving: boolean;
  formatMoney: (amount: number | undefined) => string;
  onOpenChange: (open: boolean) => void;
  onPaymentMethodChange: (method: DeskPaymentMethod) => void;
  onAmountChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
}

export function RecordPaymentDialog({
  dialogInvoice,
  paymentMethod,
  amount,
  balanceDue,
  amountIsValid,
  reference,
  notes,
  canRecordPayment,
  isSaving,
  formatMoney,
  onOpenChange,
  onPaymentMethodChange,
  onAmountChange,
  onReferenceChange,
  onNotesChange,
  onSubmit,
}: RecordPaymentDialogProps) {
  return (
    <Dialog open={dialogInvoice !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <MicroLabel className="text-muted-foreground">Desk</MicroLabel>
          <DialogTitle>Record desk payment</DialogTitle>
          <DialogDescription>
            Record a payment collected at the front desk. Pay the full balance
            or a partial advance — the invoice updates accordingly.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {dialogInvoice ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
              <p className="text-[var(--fs-xs)] text-muted-foreground">
                {dialogInvoice.invoiceNumber
                  ? `Invoice #${dialogInvoice.invoiceNumber}`
                  : `Invoice ${dialogInvoice.id?.slice(0, 8)}`}
              </p>
              <p className="text-[var(--fs-lg)] font-semibold">
                {formatMoney(dialogInvoice.total ?? dialogInvoice.grandTotal)}
              </p>
              <p className="text-[var(--fs-xs)] text-muted-foreground">
                Balance due {formatMoney(balanceDue)}
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="desk-channel" className="text-[var(--fs-xs)]">
              Payment method
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => {
                const match = PAYMENT_CHANNEL_OPTIONS.find(
                  (opt) => opt.value === v,
                );
                if (match) onPaymentMethodChange(match.value);
              }}
            >
              <SelectTrigger id="desk-channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_CHANNEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desk-amount" className="text-[var(--fs-xs)]">
              Amount received
            </Label>
            <Input
              id="desk-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              autoComplete="off"
              aria-invalid={!amountIsValid}
            />
            {!amountIsValid ? (
              <p className="text-[var(--fs-xs)] text-destructive">
                Enter an amount between {formatMoney(0.01)} and{" "}
                {formatMoney(balanceDue)}.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="desk-reference" className="text-[var(--fs-xs)]">
              Reference or receipt ID (optional)
            </Label>
            <Input
              id="desk-reference"
              value={reference}
              onChange={(e) => onReferenceChange(e.target.value)}
              autoComplete="off"
              placeholder="Enter reference or receipt ID"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desk-notes" className="text-[var(--fs-xs)]">
              Notes (optional)
            </Label>
            <Textarea
              id="desk-notes"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Enter notes"
              rows={3}
              className="min-h-[80px] resize-y"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canRecordPayment || isSaving}
          >
            {isSaving ? "Saving…" : "Confirm desk payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
