"use client";

import { PaymentProcessingAdditionalChargeDialog } from "@/features/payment-processing/payment-processing-additional-charge-dialog";
import { PaymentProcessingPaymentDialog } from "@/features/payment-processing/payment-processing-payment-dialog";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

export type PaymentProcessingDialogsProps = Pick<
  PaymentProcessingPageViewModel,
  | "showPaymentDialog"
  | "setShowPaymentDialog"
  | "selectedClinic"
  | "tierInfo"
  | "selectedTierPricing"
  | "tierPricing"
  | "form"
  | "onSubmit"
  | "processPaymentMutation"
  | "showAdditionalChargeDialog"
  | "setShowAdditionalChargeDialog"
  | "additionalChargeClinic"
  | "setAdditionalChargeClinic"
  | "additionalChargeForm"
  | "onSubmitAdditionalCharge"
  | "recordAdditionalChargeMutation"
>;

export function PaymentProcessingDialogs(state: PaymentProcessingDialogsProps) {
  return (
    <>
      <PaymentProcessingPaymentDialog
        showPaymentDialog={state.showPaymentDialog}
        setShowPaymentDialog={state.setShowPaymentDialog}
        selectedClinic={state.selectedClinic}
        tierInfo={state.tierInfo}
        selectedTierPricing={state.selectedTierPricing}
        tierPricing={state.tierPricing}
        form={state.form}
        onSubmit={state.onSubmit}
        processPaymentMutation={state.processPaymentMutation}
      />
      <PaymentProcessingAdditionalChargeDialog
        showAdditionalChargeDialog={state.showAdditionalChargeDialog}
        setShowAdditionalChargeDialog={state.setShowAdditionalChargeDialog}
        additionalChargeClinic={state.additionalChargeClinic}
        setAdditionalChargeClinic={state.setAdditionalChargeClinic}
        additionalChargeForm={state.additionalChargeForm}
        onSubmitAdditionalCharge={state.onSubmitAdditionalCharge}
        recordAdditionalChargeMutation={state.recordAdditionalChargeMutation}
      />
    </>
  );
}
