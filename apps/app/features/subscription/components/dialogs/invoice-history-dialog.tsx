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
import { FileText } from "lucide-react";
import { useBillingHistory } from "@workspace/data-access";
import { BillingHistoryTable } from "@/features/subscription/components/billing/BillingHistoryTable";

interface InvoiceHistoryDialogProps {
// jscpd:ignore-end
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolvePayment?: () => void;
}

export function InvoiceHistoryDialog({
  open,
  onOpenChange,
  onResolvePayment,
}: InvoiceHistoryDialogProps) {
  const { data: invoices, isLoading } = useBillingHistory(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-5xl sm:max-w-5xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Billing History
          </DialogTitle>
          <DialogDescription>
            Paid subscription charges list here; after each payment completes,
            open Receipt to download the PDF invoice. Pending rows are unpaid
            checkouts until you finish payment.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-[300px]">
          <BillingHistoryTable
            invoices={invoices}
            isLoading={isLoading}
            onPayNow={onResolvePayment}
          />
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
