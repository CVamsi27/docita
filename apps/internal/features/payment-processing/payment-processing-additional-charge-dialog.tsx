"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Form
} from "@workspace/ui/components";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";
import { AdditionalChargeFormFields } from "./additional-charge-form-fields";
import { ChargeSummary } from "./charge-summary";

type PaymentProcessingAdditionalChargeDialogProps = Pick<PaymentProcessingPageViewModel, 'showAdditionalChargeDialog' | 'setShowAdditionalChargeDialog' | 'additionalChargeClinic' | 'setAdditionalChargeClinic' | 'additionalChargeForm' | 'onSubmitAdditionalCharge' | 'recordAdditionalChargeMutation'>;

export function PaymentProcessingAdditionalChargeDialog(props: PaymentProcessingAdditionalChargeDialogProps) {
  const { showAdditionalChargeDialog, setShowAdditionalChargeDialog, additionalChargeClinic, setAdditionalChargeClinic, additionalChargeForm, onSubmitAdditionalCharge, recordAdditionalChargeMutation } = props;
  return (
    <Dialog
        open={showAdditionalChargeDialog}
        onOpenChange={(open) => {
          setShowAdditionalChargeDialog(open);
          if (!open) {
            setAdditionalChargeClinic(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Add-on charge — {additionalChargeClinic?.name}
            </DialogTitle>
            <DialogDescription>
              Records a paid one-off charge (for example guided setup) in
              billing history. This does not change the clinic subscription
              tier.
            </DialogDescription>
          </DialogHeader>

          <Form {...additionalChargeForm}>
            <form
              onSubmit={additionalChargeForm.handleSubmit(onSubmitAdditionalCharge)}
              noValidate
              className="space-y-4"
            >
              <AdditionalChargeFormFields
                additionalChargeClinic={additionalChargeClinic}
                additionalChargeForm={additionalChargeForm}
              />
              <ChargeSummary additionalChargeForm={additionalChargeForm} />
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdditionalChargeDialog(false)}
                  disabled={recordAdditionalChargeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recordAdditionalChargeMutation.isPending}
                >
                  {recordAdditionalChargeMutation.isPending && (
                    <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
                  )}
                  {recordAdditionalChargeMutation.isPending ? "Saving\u2026" : "Record charge"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
  );
}
