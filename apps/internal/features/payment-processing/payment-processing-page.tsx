"use client";

import {
  AppPageScaffold,
  DataState,
  PageHeader
} from "@workspace/ui/components";
import { PaymentProcessingDialogs } from "@/features/payment-processing/payment-processing-dialogs";
import { PaymentProcessingSections } from "@/features/payment-processing/payment-processing-sections";
import { usePaymentProcessingPage } from "@/features/payment-processing/use-payment-processing-page";

export function PaymentProcessingPage() {
  const viewModel = usePaymentProcessingPage();

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Payment Processing"
          description="Record subscription payments and tier changes, or bill add-on services including guided setup"
          size="compact"
        />
      }
    >
      <DataState
        status={viewModel.pageStatus}
        loadingMessage="Loading payment processing…"
      >
        <PaymentProcessingSections
          tierPricing={viewModel.tierPricing}
          clinics={viewModel.clinics}
          loadClinicTierInfo={viewModel.loadClinicTierInfo}
          openAdditionalChargeForClinic={viewModel.openAdditionalChargeForClinic}
          pricingOffersQuery={viewModel.pricingOffersQuery}
          deletePricingOfferMutation={viewModel.deletePricingOfferMutation}
          pricingOfferForm={viewModel.pricingOfferForm}
          onSavePricingOffer={viewModel.onSavePricingOffer}
          savePricingOfferMutation={viewModel.savePricingOfferMutation}
        />
      </DataState>

      <PaymentProcessingDialogs
        showPaymentDialog={viewModel.showPaymentDialog}
        setShowPaymentDialog={viewModel.setShowPaymentDialog}
        selectedClinic={viewModel.selectedClinic}
        tierInfo={viewModel.tierInfo}
        selectedTierPricing={viewModel.selectedTierPricing}
        tierPricing={viewModel.tierPricing}
        form={viewModel.form}
        onSubmit={viewModel.onSubmit}
        processPaymentMutation={viewModel.processPaymentMutation}
        showAdditionalChargeDialog={viewModel.showAdditionalChargeDialog}
        setShowAdditionalChargeDialog={viewModel.setShowAdditionalChargeDialog}
        additionalChargeClinic={viewModel.additionalChargeClinic}
        setAdditionalChargeClinic={viewModel.setAdditionalChargeClinic}
        additionalChargeForm={viewModel.additionalChargeForm}
        onSubmitAdditionalCharge={viewModel.onSubmitAdditionalCharge}
        recordAdditionalChargeMutation={viewModel.recordAdditionalChargeMutation}
      />
    </AppPageScaffold>
  );
}
