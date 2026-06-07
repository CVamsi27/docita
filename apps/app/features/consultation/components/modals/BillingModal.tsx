"use client";

// jscpd:ignore-start
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Button } from "@workspace/ui/components/form/button";
import { Label } from "@workspace/ui/components/form/label";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import { formatCurrency } from "@workspace/utils";
import { CreditCard } from "lucide-react";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { ModalProps } from "./PrescriptionModal";
import { BillingLineItemsEditor } from "./BillingLineItemsEditor";
import { BillingModalSummaryPanel } from "./billing-modal-summary-panel";
import { useBillingModal } from "./use-billing-modal";

export type { LineItem } from "./billing-modal-types";
// jscpd:ignore-end

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

  const fmt = (n: number) => formatCurrency(n, { currency, fractionDigits: 2 });

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
            items={billing.items}
            updateItem={billing.updateItem}
            removeItem={billing.removeItem}
            addItem={billing.addItem}
          />

          <BillingModalSummaryPanel
            taxRate={billing.taxRate}
            setTaxRate={billing.setTaxRate}
            discountValue={billing.discountValue}
            setDiscountValue={billing.setDiscountValue}
            discountType={billing.discountType}
            setDiscountType={billing.setDiscountType}
            discountTypeValues={billing.discountTypeValues}
            paymentMode={billing.paymentMode}
            setPaymentMode={billing.setPaymentMode}
            calculations={billing.calculations}
            formatAmount={fmt}
          />
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
            {billing.createInvoice.isPending
              ? "Generating…"
              : "Generate Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
