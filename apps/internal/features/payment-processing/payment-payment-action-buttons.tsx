import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button } from "@workspace/ui/components/form/button";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

type PaymentActionButtonsProps = Pick<PaymentProcessingPageViewModel, 'setShowPaymentDialog' | 'processPaymentMutation'>;

export function PaymentActionButtons({ setShowPaymentDialog, processPaymentMutation }: PaymentActionButtonsProps) {
  return (
    <div className="flex gap-3 justify-end pt-4 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowPaymentDialog(false)}
        disabled={processPaymentMutation.isPending}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={processPaymentMutation.isPending}>
        {processPaymentMutation.isPending && (
          <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
        )}
        {processPaymentMutation.isPending ? "Processing\u2026" : "Process Payment"}
      </Button>
    </div>
  );
}
