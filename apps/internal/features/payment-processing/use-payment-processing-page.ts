"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useDataAccessFetcher } from "@workspace/data-access";
import {
  useInternalBillingPricingOffers, useInternalClinics, useInternalTierPricing,
} from "@workspace/data-access/internal";
import { useAuth } from "@/lib/auth/auth";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  ADDITIONAL_CHARGE_FORM_DEFAULTS, type AdditionalChargeFormData,
  buildAdditionalChargeDefaults, buildPricingOfferPayload,
  DEFAULT_PAYMENT_TIER_PRICING, derivePaymentPageStatus,
  fetchClinicTierData, LOAD_PLAN_DETAILS_ERROR, mapClinicsForPayment,
  mapPricingDataToTierPricing, parseAdditionalChargeForm,
  PAYMENT_FORM_DEFAULTS, type PaymentClinic, type PaymentFormData,
  type PaymentTierInfo, type PaymentTierPricing, PRICING_OFFER_FORM_DEFAULTS,
  type PricingOfferFormData, PROCESS_PAYMENT_ERROR, RECORD_CHARGE_ERROR,
  SAVE_DISCOUNT_ERROR, validatePricingOfferParams,
} from "./payment-processing-helpers";
import { usePaymentMutations } from "./use-payment-mutations";
export function usePaymentProcessingPage() {
  const qc = useQueryClient();
  const [selectedClinic, setSelectedClinic] = useState<PaymentClinic | null>(null);
  const [tierInfo, setTierInfo] = useState<PaymentTierInfo | null>(null);
  const [selectedTierPricing, setSelectedTierPricing] = useState<PaymentTierPricing[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAdditionalChargeDialog, setShowAdditionalChargeDialog] = useState(false);
  const [additionalChargeClinic, setAdditionalChargeClinic] = useState<PaymentClinic | null>(null);
  const { token, isInternal, isLoading } = useAuth();
  const fetcher = useDataAccessFetcher();
  const enabled = Boolean(isInternal && token);
  const clinicsQuery = useInternalClinics(token, "list", { enabled });
  const tierPricingQuery = useInternalTierPricing(token, DEFAULT_PAYMENT_TIER_PRICING, { enabled });
  const pricingOffersQuery = useInternalBillingPricingOffers(token, { enabled });
  const form = useForm<PaymentFormData>({ defaultValues: PAYMENT_FORM_DEFAULTS });
  const additionalChargeForm = useForm<AdditionalChargeFormData>({ defaultValues: ADDITIONAL_CHARGE_FORM_DEFAULTS });
  const pricingOfferForm = useForm<PricingOfferFormData>({ defaultValues: PRICING_OFFER_FORM_DEFAULTS });
  const mut = usePaymentMutations(selectedClinic, additionalChargeClinic);
  const loadClinicTierInfo = async (clinic: PaymentClinic) => {
    if (!token) return;
    try {
      const { data, pricingData } = await fetchClinicTierData(qc, fetcher, clinic);
      const nextPricing = mapPricingDataToTierPricing(pricingData);
      setSelectedTierPricing(nextPricing); setTierInfo(data); setSelectedClinic(clinic);
      form.reset({ ...PAYMENT_FORM_DEFAULTS, newTier: clinic.tier, amount: nextPricing.find((t) => t.tier === clinic.tier)?.price?.toString() ?? data.pricing.toString() });
      setShowPaymentDialog(true);
    } catch { showUserFacingErrorToast(LOAD_PLAN_DETAILS_ERROR); }
  };
  const openAdditionalChargeForClinic = (clinic: PaymentClinic) => {
    setAdditionalChargeClinic(clinic); additionalChargeForm.reset(buildAdditionalChargeDefaults(clinic)); setShowAdditionalChargeDialog(true);
  };
  const onSubmit = async (data: PaymentFormData) => {
    if (!selectedClinic || !token) return;
    try { await mut.processPaymentMutation.mutateAsync(data); } catch { showUserFacingErrorToast(PROCESS_PAYMENT_ERROR); }
  };
  const onSubmitAdditionalCharge = async (raw: AdditionalChargeFormData) => {
    if (!additionalChargeClinic || !token) return;
    const parsed = parseAdditionalChargeForm(raw, additionalChargeClinic.currency);
    if (!parsed.success) { showUserFacingErrorToast(parsed.error); return; }
    try { await mut.recordAdditionalChargeMutation.mutateAsync(parsed.data); } catch { showUserFacingErrorToast(RECORD_CHARGE_ERROR); }
  };
  const onSavePricingOffer = pricingOfferForm.handleSubmit(async (data) => {
    const err = validatePricingOfferParams(Number.parseFloat(data.percentOff), data.clinicId);
    if (err) { showUserFacingErrorToast(err); return; }
    try { await mut.savePricingOfferMutation.mutateAsync(buildPricingOfferPayload(data)); } catch { showUserFacingErrorToast(SAVE_DISCOUNT_ERROR); }
  });
  const pageStatus = derivePaymentPageStatus(isLoading, clinicsQuery.isLoading, tierPricingQuery.isLoading);
  const clinics = mapClinicsForPayment(clinicsQuery.data ?? []);
  const tierPricing = tierPricingQuery.data ?? DEFAULT_PAYMENT_TIER_PRICING;
  return { pageStatus, tierPricing, clinics, loadClinicTierInfo, openAdditionalChargeForClinic,
    pricingOffersQuery, deletePricingOfferMutation: mut.deletePricingOfferMutation,
    pricingOfferForm, onSavePricingOffer, savePricingOfferMutation: mut.savePricingOfferMutation,
    form, selectedClinic, tierInfo, selectedTierPricing, showPaymentDialog, setShowPaymentDialog,
    showAdditionalChargeDialog, setShowAdditionalChargeDialog, additionalChargeClinic,
    setAdditionalChargeClinic, additionalChargeForm, processPaymentMutation: mut.processPaymentMutation,
    onSubmit, recordAdditionalChargeMutation: mut.recordAdditionalChargeMutation, onSubmitAdditionalCharge };
}
export type PaymentProcessingPageViewModel = ReturnType<typeof usePaymentProcessingPage>;
