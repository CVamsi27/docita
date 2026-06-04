"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { billingAPI } from "@/lib/api/api";
import { client } from "@/lib/api/api-client";
import { internalQueryKeys } from "@/lib/api/query-keys";
import {
  buildPaymentRequestPayload,
  type PaymentClinic,
  type PaymentFormData,
} from "./payment-processing-helpers";

export function usePaymentMutations(
  selectedClinic: PaymentClinic | null,
  additionalChargeClinic: PaymentClinic | null,
) {
  const queryClient = useQueryClient();

  const processPaymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) =>
      client.post(
        `/internal/clinics/${selectedClinic?.id}/process-payment`,
        buildPaymentRequestPayload(selectedClinic, data),
      ),
    onSuccess: () => {
      toast.success("Payment processed and tier updated successfully");
    },
  });

  const recordAdditionalChargeMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      client.post(
        `/internal/clinics/${additionalChargeClinic?.id}/additional-charge`,
        data,
      ),
    onSuccess: () => {
      toast.success("Additional charge recorded");
    },
  });

  const savePricingOfferMutation = useMutation({
    mutationFn: (payload: {
      clinicId: string;
      title: string;
      percentOff: number;
      validUntil?: string;
      notes?: string;
    }) => billingAPI.upsertPricingOffer(payload.clinicId, payload),
    onSuccess: async () => {
      toast.success("Checkout discount saved");
      await queryClient.invalidateQueries({
        queryKey: internalQueryKeys.internal.billingPricingOffers(),
      });
    },
  });

  const deletePricingOfferMutation = useMutation({
    mutationFn: (clinicId: string) => billingAPI.deletePricingOffer(clinicId),
    onSuccess: async () => {
      toast.success("Checkout discount removed");
      await queryClient.invalidateQueries({
        queryKey: internalQueryKeys.internal.billingPricingOffers(),
      });
    },
  });

  return {
    processPaymentMutation,
    recordAdditionalChargeMutation,
    savePricingOfferMutation,
    deletePricingOfferMutation,
  };
}
