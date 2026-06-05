"use client";

import { useEffect, useMemo, useState } from "react";
import { internalQueryKeys } from "@/lib/api/query-keys";
import {
  type InternalPricingOfferRow,
  type InternalTierPricingRow,
  useInternalBillingPricingOffers,
  useInternalBillingPricingTiers,
  useInternalClinics,
} from "@workspace/data-access/internal";
import { useAuth } from "@/lib/auth/auth";
import { getUserFacingErrorMessage } from "@workspace/utils";
import {
  buildPageStatus,
  clinicToOption,
  DEFAULT_OFFER_FORM,
  type EditableTierRow,
  type OfferTemplate,
  PRICING_LOAD_ERROR_FALLBACK,
  type PricingOfferFormState,
} from "./pricing-helpers";
import { usePricingMutations } from "./use-pricing-mutations";

export function usePricingPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [tiers, setTiers] = useState<EditableTierRow[]>([]);
  const [offerForm, setOfferForm] =
    useState<PricingOfferFormState>(DEFAULT_OFFER_FORM);

  const tiersQuery = useInternalBillingPricingTiers(token, {
    enabled: Boolean(token && !authLoading),
  });
  const offersQuery = useInternalBillingPricingOffers(token, {
    enabled: Boolean(token && !authLoading),
  });
  const clinicsQuery = useInternalClinics(token, "list", {
    enabled: Boolean(token && !authLoading),
  });

  const offers: InternalPricingOfferRow[] = offersQuery.data ?? [];
  const clinics = useMemo(() => clinicsQuery.data ?? [], [clinicsQuery.data]);
  const isLoadingClinics = clinicsQuery.isLoading;

  const offersQueryKey = internalQueryKeys.internal.billingPricingOffers();

  const mutations = usePricingMutations(
    offerForm,
    setOfferForm,
    setTiers,
    offersQueryKey,
  );

  useEffect(() => {
    if (tiersQuery.data) {
      setTiers(tiersQuery.data.map((tier) => ({ ...tier, isDirty: false })));
    }
  }, [tiersQuery.data]);

  const clinicOptions = useMemo(() => clinics.map(clinicToOption), [clinics]);

  const handleTierFieldChange = (
    tierId: string,
    field: keyof InternalTierPricingRow,
    value: number | string,
  ) => {
    setTiers((prev) =>
      prev.map((tier) =>
        tier.id === tierId ? { ...tier, [field]: value, isDirty: true } : tier,
      ),
    );
  };

  const applyTemplate = (template: OfferTemplate) => {
    setOfferForm((prev) => ({
      ...prev,
      title: template.title,
      description: template.description,
      percentOff: template.percentOff,
      durationMonths: template.durationMonths,
      notes: template.notes,
    }));
  };

  const isLoading =
    authLoading ||
    !token ||
    tiersQuery.isLoading ||
    offersQuery.isLoading ||
    isLoadingClinics;
  const queryError =
    tiersQuery.error ?? offersQuery.error ?? clinicsQuery.error;
  const loadError = queryError
    ? getUserFacingErrorMessage(queryError, {
        context: "load",
        fallback: PRICING_LOAD_ERROR_FALLBACK,
      })
    : undefined;
  const pageStatus = buildPageStatus(isLoading, queryError);

  const refetchAll = () => {
    void tiersQuery.refetch();
    void offersQuery.refetch();
    void clinicsQuery.refetch();
  };

  return {
    tiers,
    savingId: mutations.savingId,
    saveError: mutations.saveError,
    offerForm,
    offers,
    clinicOptions,
    isLoadingClinics,
    pageStatus,
    loadError,
    setOfferForm,
    setSaveError: mutations.setSaveError,
    handleTierFieldChange,
    saveTier: mutations.saveTier,
    saveOffer: mutations.saveOffer,
    deleteOffer: mutations.deleteOffer,
    applyTemplate,
    refetchAll,
  };
}
