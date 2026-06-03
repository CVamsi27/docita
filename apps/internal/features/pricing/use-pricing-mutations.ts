"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { billingAPI } from "@/lib/api/api";
import {
  DEFAULT_OFFER_FORM,
  type EditableTierRow,
  type PricingOfferFormState,
} from "./pricing-helpers";

export function usePricingMutations(
  offerForm: PricingOfferFormState,
  setOfferForm: Dispatch<SetStateAction<PricingOfferFormState>>,
  setTiers: Dispatch<SetStateAction<EditableTierRow[]>>,
  offersQueryKey: readonly unknown[],
) {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveTier = async (tier: EditableTierRow) => {
    setSavingId(tier.id);
    setSaveError(null);
    try {
      await billingAPI.updatePricingTier(tier.id, {
        monthlyBasePriceCents: tier.monthlyBasePriceCents,
        includedPatients: tier.includedPatients,
        includedAppointments: tier.includedAppointments,
        includedStorageGB: tier.includedStorageGB,
        includedUsers: tier.includedUsers,
        overagePatientCents: tier.overagePatientCents,
        overageAppointmentCents: tier.overageAppointmentCents,
        overageStorageCents: tier.overageStorageCents,
        overageUserCents: tier.overageUserCents,
        overagePrescriptionCents: tier.overagePrescriptionCents,
        overageInvoiceCents: tier.overageInvoiceCents,
        overageOcrPageCents: tier.overageOcrPageCents,
        overageApiCallCents: tier.overageApiCallCents,
      });
      setTiers((prev) =>
        prev.map((item) =>
          item.id === tier.id ? { ...item, isDirty: false } : item,
        ),
      );
    } catch {
      setSaveError(
        `We could not save ${tier.name}. Please try again.`,
      );
    } finally {
      setSavingId(null);
    }
  };

  const saveOffer = async () => {
    if (!offerForm.clinicId || !offerForm.title.trim()) {
      setSaveError("Pick a clinic and enter an offer title first");
      return;
    }

    setSavingId(offerForm.clinicId);
    setSaveError(null);
    try {
      await billingAPI.upsertPricingOffer(offerForm.clinicId, {
        title: offerForm.title.trim(),
        description: offerForm.description.trim(),
        percentOff: offerForm.percentOff,
        durationMonths: offerForm.durationMonths || undefined,
        validUntil: offerForm.validUntil || undefined,
        notes: offerForm.notes.trim() || undefined,
      });

      await queryClient.invalidateQueries({ queryKey: offersQueryKey });
      setOfferForm(DEFAULT_OFFER_FORM);
    } catch {
      setSaveError(
        "We could not save this facility offer. Please try again.",
      );
    } finally {
      setSavingId(null);
    }
  };

  const deleteOffer = async (clinicId: string) => {
    setSavingId(clinicId);
    setSaveError(null);
    try {
      await billingAPI.deletePricingOffer(clinicId);
      await queryClient.invalidateQueries({ queryKey: offersQueryKey });
      if (offerForm.clinicId === clinicId) {
        setOfferForm(DEFAULT_OFFER_FORM);
      }
    } catch {
      setSaveError(
        "We could not delete the facility offer. Please try again.",
      );
    } finally {
      setSavingId(null);
    }
  };

  return {
    savingId,
    saveError,
    setSaveError,
    saveTier,
    saveOffer,
    deleteOffer,
  };
}
