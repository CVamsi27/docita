"use client";

import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";
import { PaymentProcessingClinicsSection } from "@/features/payment-processing/payment-processing-clinics-section";
import { PaymentProcessingPricingOffersSection } from "@/features/payment-processing/payment-processing-pricing-offers-section";
import { PaymentProcessingTierPricingSection } from "@/features/payment-processing/payment-processing-tier-pricing-section";

export type PaymentProcessingSectionsProps = Pick<
  PaymentProcessingPageViewModel,
  | "tierPricing"
  | "clinics"
  | "loadClinicTierInfo"
  | "openAdditionalChargeForClinic"
  | "pricingOffersQuery"
  | "deletePricingOfferMutation"
  | "pricingOfferForm"
  | "onSavePricingOffer"
  | "savePricingOfferMutation"
>;

export function PaymentProcessingSections(props: PaymentProcessingSectionsProps) {
  return (
    <>
      <PaymentProcessingTierPricingSection tierPricing={props.tierPricing} />
      <PaymentProcessingClinicsSection
        tierPricing={props.tierPricing}
        clinics={props.clinics}
        loadClinicTierInfo={props.loadClinicTierInfo}
        openAdditionalChargeForClinic={props.openAdditionalChargeForClinic}
      />
      <PaymentProcessingPricingOffersSection
        clinics={props.clinics}
        pricingOffersQuery={props.pricingOffersQuery}
        deletePricingOfferMutation={props.deletePricingOfferMutation}
        pricingOfferForm={props.pricingOfferForm}
        onSavePricingOffer={props.onSavePricingOffer}
        savePricingOfferMutation={props.savePricingOfferMutation}
      />
    </>
  );
}
