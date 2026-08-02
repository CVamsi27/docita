import { Button, DatePicker, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label, Switch } from "@workspace/ui/components";
import { formatCurrency } from "@workspace/utils";
import { BadgeCheck, CreditCard, FileText, PencilLine } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import type { InvoiceListRow } from "@workspace/data-access";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@workspace/types";
import { BillingLineItemsEditor } from "./BillingLineItemsEditor";
import { BillingModalSummaryPanel } from "./billing-modal-summary-panel";
import { useBillingModal } from "./use-billing-modal";

export type { LineItem } from "./billing-modal-types";

// In the Next.js app this interface came from ./PrescriptionModal; that modal
// is not ported yet, so it is defined here until the shared type lands.
export interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  appointmentId?: string;
  patientId?: string;
  patientName?: string;
  doctorId?: string;
  onSaved?: () => void;
}

export interface BillingModalProps extends ModalProps {
  existingInvoice?: InvoiceListRow | null;
}

export function BillingModal({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  patientName,
  existingInvoice,
  onSaved,
}: BillingModalProps) {
  const { currency } = useLocaleCurrency();
  const billing = useBillingModal({
    appointmentId,
    patientId,
    existingInvoice,
    onSaved,
    onOpenChange,
  });

  const fmt = (n: number) => formatCurrency(n, { currency, fractionDigits: 2 });
  const isEditMode = billing.isEditMode;
  const isSaving = billing.createInvoice.isPending || billing.updateInvoice.isPending;
  const existingStatusLabel = existingInvoice
    ? resolveInvoiceStatusLabel(existingInvoice.status)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-success" />
            {isEditMode ? "Edit Invoice" : "Create Invoice"}
          </DialogTitle>
          <DialogDescription>
            {patientName
              ? `Billing for ${patientName}`
              : "Add billable line items and set a due date."}
          </DialogDescription>
        </DialogHeader>

        {isEditMode && existingInvoice ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-primary">
              <PencilLine className="h-3.5 w-3.5" />
              Editing existing invoice
            </span>
            <span className="text-muted-foreground">
              {existingStatusLabel}
              {existingInvoice.invoiceNumber
                ? ` · ${existingInvoice.invoiceNumber}`
                : ""}
            </span>
          </div>
        ) : null}

        <div className="flex flex-col gap-5 min-w-0">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Line Items
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Due Date</Label>
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

          {!isEditMode ? (
            <div
              className={cn(
                "flex items-center justify-between rounded-lg border px-4 py-3 transition-colors",
                billing.collectNow
                  ? "border-success/40 bg-success/5"
                  : "border-border/60 bg-muted/30",
              )}
            >
              <div className="flex items-center gap-2.5">
                <BadgeCheck
                  className={cn(
                    "h-4 w-4 transition-colors",
                    billing.collectNow ? "text-success" : "text-muted-foreground",
                  )}
                />
                <div>
                  <p className="text-sm font-medium leading-none">
                    Collect payment now
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {billing.collectNow
                      ? `Invoice will be marked as Paid via ${billing.paymentMode}`
                      : "Invoice will be saved as Pending"}
                  </p>
                </div>
              </div>
              <Switch
                checked={billing.collectNow}
                onCheckedChange={billing.setCollectNow}
                aria-label="Collect payment now"
              />
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              To collect payment for an existing invoice, open it from the
              billing list or the patient&apos;s record. This form updates line
              items, tax, discount, and status only.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button
            onClick={billing.handleSave}
            disabled={isSaving}
            className={cn(
              "min-w-36",
              billing.collectNow &&
                !isEditMode &&
                "bg-success hover:bg-success/90 text-success-foreground",
            )}
          >
            {isSaving ? (
              isEditMode ? "Saving…" : "Generating…"
            ) : isEditMode ? (
              <>
                <PencilLine className="mr-1.5 h-4 w-4" />
                Save changes
              </>
            ) : billing.collectNow ? (
              <>
                <BadgeCheck className="mr-1.5 h-4 w-4" />
                Collect & Close
              </>
            ) : (
              <>
                <FileText className="mr-1.5 h-4 w-4" />
                Generate Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Looks up the human-readable status for an invoice. Falls back to the raw
 * value when the API returns an unknown code (forward-compat with codes the
 * client hasn't been re-generated against yet).
 */
function resolveInvoiceStatusLabel(status: string): string {
  if (isKnownInvoiceStatus(status)) {
    return INVOICE_STATUS_LABELS[status];
  }
  return status;
}

function isKnownInvoiceStatus(status: string): status is InvoiceStatus {
  return status in INVOICE_STATUS_LABELS;
}
