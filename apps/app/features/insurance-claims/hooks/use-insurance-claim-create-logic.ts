"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  useCreateInsuranceClaim,
  useInvoice,
  useInvoiceClaimReadiness,
  usePatient,
  usePatients,
} from "@workspace/data-access";
import {
  createInsuranceClaimFormSchema,
  type CreateInsuranceClaimFormValues,
} from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  applyInvoiceClaimAmountDefault,
  applyPatientInsuranceDefaults,
  buildClaimCreateDefaultValues,
  buildCreateClaimPayload,
} from "./insurance-claim-create-helpers";
import type { ClaimCreatePresets } from "./insurance-claim-create-types";

export type { ClaimCreatePresets };

export const useInsuranceClaimCreateLogic = (presets?: ClaimCreatePresets) => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");

  const { data: patientsData, isLoading: patientsLoading } = usePatients({
    search: patientSearch,
    limit: 10,
    enabled: !presets?.patientId,
  });

  const createClaim = useCreateInsuranceClaim();
  const { data: presetPatient } = usePatient(presets?.patientId ?? "");
  const { data: presetInvoice } = useInvoice(presets?.invoiceId ?? "");
  const { data: claimReadiness, isLoading: claimReadinessLoading } =
    useInvoiceClaimReadiness(presets?.invoiceId ?? "");
  const form = useForm<CreateInsuranceClaimFormValues>({
    resolver: zodResolver(createInsuranceClaimFormSchema),
    defaultValues: buildClaimCreateDefaultValues(presets),
  });
  useEffect(() => {
    applyPatientInsuranceDefaults(form, presetPatient);
  }, [form, presetPatient]);
  useEffect(() => {
    applyInvoiceClaimAmountDefault(form, presetInvoice);
  }, [form, presetInvoice]);
  const onSubmit = async (data: CreateInsuranceClaimFormValues) => {
    try {
      setIsSaving(true);
      const result = await createClaim.mutateAsync(
        buildCreateClaimPayload(data),
      );
      toast.success("Insurance claim created");
      requestAnimationFrame(() => {
        router.push(`/insurance-claims/${result.id}`);
      });
    } catch {
      showUserFacingErrorToast(
        "We could not create this claim. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };
  return {
    form,
    onSubmit,
    isSaving,
    router,
    presets,
    patients: patientsData?.items ?? [],
    patientsLoading,
    presetPatient,
    claimReadiness,
    claimReadinessLoading,
    patientSearch,
    setPatientSearch,
  };
};
