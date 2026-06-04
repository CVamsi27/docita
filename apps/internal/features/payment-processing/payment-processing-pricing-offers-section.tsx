"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Form } from "@workspace/ui/components/form/form";
import { Percent } from "lucide-react";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";
import {
  PricingOfferFormSection,
  PricingOffersTableSection,
} from "./payment-processing-pricing-offers-section-sections";

type PaymentProcessingPricingOffersSectionProps = Pick<
  PaymentProcessingPageViewModel,
  | "clinics"
  | "pricingOffersQuery"
  | "deletePricingOfferMutation"
  | "pricingOfferForm"
  | "onSavePricingOffer"
  | "savePricingOfferMutation"
>;

export function PaymentProcessingPricingOffersSection({
  clinics,
  pricingOffersQuery,
  deletePricingOfferMutation,
  pricingOfferForm,
  onSavePricingOffer,
  savePricingOfferMutation,
}: PaymentProcessingPricingOffersSectionProps) {
  const handleRemove = async (clinicId: string) => {
    try {
      await deletePricingOfferMutation.mutateAsync(clinicId);
    } catch {
      showUserFacingErrorToast("Could not remove checkout discount.");
    }
  };

  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" aria-hidden />
            Checkout discounts (subscription)
          </CardTitle>
          <CardDescription>
            Apply a percent-off offer to the facility&apos;s next subscription
            checkout (Razorpay). Separate from add-on charges. Remove the offer
            when it should no longer apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PricingOffersTableSection
            isLoading={pricingOffersQuery.isLoading}
            offers={pricingOffersQuery.data ?? []}
            onRemove={handleRemove}
            isRemoving={deletePricingOfferMutation.isPending}
          />

          <Form {...pricingOfferForm}>
            <form
              onSubmit={onSavePricingOffer}
              className="space-y-4 border-t border-border/60 pt-4"
              noValidate
            >
              <PricingOfferFormSection
                form={pricingOfferForm}
                clinics={clinics}
                isSaving={savePricingOfferMutation.isPending}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
  );
}
