"use client";

// jscpd:ignore-start
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Form } from "@workspace/ui/components/form/form";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";
import { PaymentSummarySection } from "./payment-payment-summary-section";
import { PaymentFormFields } from "./payment-payment-form-fields";
import { PaymentActionButtons } from "./payment-payment-action-buttons";

type PaymentProcessingPaymentDialogProps = Pick<PaymentProcessingPageViewModel, 'showPaymentDialog' | 'setShowPaymentDialog' | 'selectedClinic' | 'tierInfo' | 'selectedTierPricing' | 'tierPricing' | 'form' | 'onSubmit' | 'processPaymentMutation'>;

export function PaymentProcessingPaymentDialog(props: PaymentProcessingPaymentDialogProps) {
  const { showPaymentDialog, setShowPaymentDialog, selectedClinic, tierInfo, selectedTierPricing, tierPricing, form, onSubmit, processPaymentMutation } = props;
  return (
    <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Payment Processing - {selectedClinic?.name}
            </DialogTitle>
            <DialogDescription>
              Process payment and update clinic tier
            </DialogDescription>
          </DialogHeader>

          {tierInfo && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                className="space-y-4"
              >
                <PaymentSummarySection
                  selectedClinic={selectedClinic}
                  tierInfo={tierInfo}
                  selectedTierPricing={selectedTierPricing}
                />
                <PaymentFormFields
                  selectedClinic={selectedClinic}
                  selectedTierPricing={selectedTierPricing}
                  tierPricing={tierPricing}
                  form={form}
                />
                <PaymentActionButtons
                  setShowPaymentDialog={setShowPaymentDialog}
                  processPaymentMutation={processPaymentMutation}
                />
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
  );
}
// jscpd:ignore-end
