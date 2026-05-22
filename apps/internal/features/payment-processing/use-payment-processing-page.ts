"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchInternalClinicTierInfo,
  fetchInternalPricingConfig,
  useInternalBillingPricingOffers,
  useInternalClinics,
  useInternalTierPricing,
} from "@workspace/data-access/internal";
import { useDataAccessFetcher } from "@workspace/data-access";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { recordInternalAdditionalChargeRequestSchema } from "@workspace/types";
import { DEFAULT_CURRENCY } from "@workspace/utils";
import { useAuth } from "@/lib/auth/auth";
import { billingAPI } from "@/lib/api/api";
import { client } from "@/lib/api/api-client";
import { internalQueryKeys } from "@/lib/api/query-keys";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { DataStateStatus } from "@workspace/ui/components/data-display/data-state";
import {
  type AdditionalChargeFormData,
  DEFAULT_PAYMENT_TIER_PRICING,
  guidedSetupPresetAmount,
  mapClinicsForPayment,
  type PaymentClinic,
  type PaymentFormData,
  type PaymentTierInfo,
  type PaymentTierPricing,
  type PricingOfferFormData,
} from "@/features/payment-processing/payment-processing-helpers";

export function usePaymentProcessingPage() {
  const queryClient = useQueryClient();
  const [selectedClinic, setSelectedClinic] = useState<PaymentClinic | null>(
    null,
  );
  const [tierInfo, setTierInfo] = useState<PaymentTierInfo | null>(null);
  const [selectedTierPricing, setSelectedTierPricing] = useState<
    PaymentTierPricing[]
  >([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAdditionalChargeDialog, setShowAdditionalChargeDialog] =
    useState(false);
  const [additionalChargeClinic, setAdditionalChargeClinic] =
    useState<PaymentClinic | null>(null);

  const { token, isInternal, isLoading } = useAuth();
  const fetcher = useDataAccessFetcher();
  const form = useForm<PaymentFormData>({
    defaultValues: {
      paymentMethod: "razorpay",
      amount: "",
      newTier: "",
      paymentNotes: "",
    },
  });
  const clinicsQuery = useInternalClinics(token, "list", {
    enabled: Boolean(isInternal && token),
  });

  const tierPricingQuery = useInternalTierPricing(
    token,
    DEFAULT_PAYMENT_TIER_PRICING,
    {
      enabled: Boolean(isInternal && token),
    },
  );

  const additionalChargeForm = useForm<AdditionalChargeFormData>({
    defaultValues: {
      category: "GUIDED_SETUP",
      amount: "",
      paymentMethod: "manual",
      razorpayPaymentId: "",
      notes: "",
    },
  });

  const pricingOfferForm = useForm<PricingOfferFormData>({
    defaultValues: {
      clinicId: "",
      percentOff: "10",
      title: "Commercial discount",
      validUntil: "",
      notes: "",
    },
  });

  const pricingOffersQuery = useInternalBillingPricingOffers(token, {
    enabled: Boolean(isInternal && token),
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
      pricingOfferForm.reset({
        clinicId: "",
        percentOff: "10",
        title: "Commercial discount",
        validUntil: "",
        notes: "",
      });
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

  const clinics = mapClinicsForPayment(clinicsQuery.data ?? []);
  const tierPricing = tierPricingQuery.data ?? DEFAULT_PAYMENT_TIER_PRICING;
  const loading = clinicsQuery.isLoading || tierPricingQuery.isLoading;

  const loadClinicTierInfo = async (clinic: PaymentClinic) => {
    if (!token) return;

    try {
      const data = await queryClient.fetchQuery({
        queryKey: internalQueryKeys.internal.clinicTierInfo(clinic.id),
        queryFn: () => fetchInternalClinicTierInfo(fetcher, clinic.id),
      });

      const pricingData = await queryClient.fetchQuery({
        queryKey: internalQueryKeys.internal.pricingConfig(
          clinic.currency || DEFAULT_CURRENCY,
        ),
        queryFn: () =>
          fetchInternalPricingConfig(
            fetcher,
            clinic.currency || DEFAULT_CURRENCY,
          ),
      });
      const nextPricing: PaymentTierPricing[] = Array.isArray(pricingData.tiers)
        ? pricingData.tiers.map((tier) => ({
            tier: tier.id,
            price:
              typeof tier.pricing?.monthly === "number"
                ? tier.pricing.monthly
                : 0,
            billingCycle: "monthly",
            maxDoctors: -1,
            maxPatients: -1,
            features: [],
          }))
        : [];
      setSelectedTierPricing(nextPricing);

      setTierInfo(data);
      setSelectedClinic(clinic);
      form.reset({
        paymentMethod: "razorpay",
        newTier: clinic.tier,
        amount:
          nextPricing.find((t) => t.tier === clinic.tier)?.price?.toString() ??
          data.pricing.toString(),
        paymentNotes: "",
      });
      setShowPaymentDialog(true);
    } catch {
      showUserFacingErrorToast(
        "We could not load these plan details. Please try again.",
      );
    }
  };

  const openAdditionalChargeForClinic = (clinic: PaymentClinic) => {
    setAdditionalChargeClinic(clinic);
    const defaultAmount = guidedSetupPresetAmount(clinic.currency);
    additionalChargeForm.reset({
      category: "GUIDED_SETUP",
      amount: defaultAmount,
      paymentMethod: "manual",
      razorpayPaymentId: "",
      notes: "",
    });
    setShowAdditionalChargeDialog(true);
  };

  const recordAdditionalChargeMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      client.post(
        `/internal/clinics/${additionalChargeClinic?.id}/additional-charge`,
        data,
      ),
    onSuccess: async () => {
      const currencySnapshot = additionalChargeClinic?.currency;
      toast.success("Additional charge recorded");
      setShowAdditionalChargeDialog(false);
      setAdditionalChargeClinic(null);
      additionalChargeForm.reset({
        category: "GUIDED_SETUP",
        amount: guidedSetupPresetAmount(currencySnapshot),
        paymentMethod: "manual",
        razorpayPaymentId: "",
        notes: "",
      });
      await clinicsQuery.refetch();
    },
  });

  const processPaymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) =>
      client.post(`/internal/clinics/${selectedClinic?.id}/process-payment`, {
        paymentId: `PAY_${Date.now()}`,
        amount: parseFloat(data.amount),
        currency: selectedClinic?.currency || DEFAULT_CURRENCY,
        newTier: data.newTier,
        paymentMethod: data.paymentMethod,
        notes: data.paymentNotes,
      }),
    onSuccess: async () => {
      toast.success("Payment processed and tier updated successfully");
      setShowPaymentDialog(false);
      await clinicsQuery.refetch();
      form.reset({
        paymentMethod: "razorpay",
        amount: "",
        newTier: "",
        paymentNotes: "",
      });
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    if (!selectedClinic || !token) return;

    try {
      await processPaymentMutation.mutateAsync(data);
    } catch {
      showUserFacingErrorToast(
        "We could not process this payment. Please try again.",
      );
    }
  };

  const onSubmitAdditionalCharge = async (raw: AdditionalChargeFormData) => {
    if (!additionalChargeClinic || !token) return;

    const amount = Number.parseFloat(raw.amount);
    const parsed = recordInternalAdditionalChargeRequestSchema.safeParse({
      category: raw.category,
      paymentMethod: raw.paymentMethod,
      amount,
      currency: additionalChargeClinic.currency || DEFAULT_CURRENCY,
      razorpayPaymentId: raw.razorpayPaymentId.trim() || undefined,
      notes: raw.notes.trim() || undefined,
    });

    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg =
        first.amount?.[0] ??
        first.category?.[0] ??
        first.paymentMethod?.[0] ??
        "Check the form and try again.";
      showUserFacingErrorToast(msg);
      return;
    }

    try {
      await recordAdditionalChargeMutation.mutateAsync(parsed.data);
    } catch {
      showUserFacingErrorToast(
        "We could not record this charge. Please try again.",
      );
    }
  };

  const onSavePricingOffer = pricingOfferForm.handleSubmit(async (data) => {
    const percent = Number.parseFloat(data.percentOff);
    if (!Number.isFinite(percent) || percent < 0 || percent > 95) {
      showUserFacingErrorToast(
        "Percent off must be a number between 0 and 95.",
      );
      return;
    }
    if (!data.clinicId) {
      showUserFacingErrorToast("Select a facility.");
      return;
    }
    try {
      await savePricingOfferMutation.mutateAsync({
        clinicId: data.clinicId,
        title: data.title.trim() || "Commercial discount",
        percentOff: percent,
        validUntil: data.validUntil.trim() || undefined,
        notes: data.notes.trim() || undefined,
      });
    } catch {
      showUserFacingErrorToast(
        "We could not save this checkout discount. Please try again.",
      );
    }
  });

  const pageStatus: DataStateStatus =
    isLoading || loading ? "loading" : "success";

  return {
    pageStatus,
    tierPricing,
    clinics,
    loadClinicTierInfo,
    openAdditionalChargeForClinic,
    pricingOffersQuery,
    deletePricingOfferMutation,
    pricingOfferForm,
    onSavePricingOffer,
    savePricingOfferMutation,
    form,
    selectedClinic,
    tierInfo,
    selectedTierPricing,
    showPaymentDialog,
    setShowPaymentDialog,
    showAdditionalChargeDialog,
    setShowAdditionalChargeDialog,
    additionalChargeClinic,
    setAdditionalChargeClinic,
    additionalChargeForm,
    processPaymentMutation,
    onSubmit,
    recordAdditionalChargeMutation,
    onSubmitAdditionalCharge,
  };
}

export type PaymentProcessingPageViewModel = ReturnType<
  typeof usePaymentProcessingPage
>;
