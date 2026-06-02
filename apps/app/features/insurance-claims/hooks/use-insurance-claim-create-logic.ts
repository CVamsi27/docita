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

export interface ClaimCreatePresets {
  patientId?: string;
  invoiceId?: string;
  claimType?: CreateInsuranceClaimFormValues["claimType"];
}

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
    defaultValues: {
      patientId: presets?.patientId ?? "",
      claimType:
        presets?.claimType ?? (presets?.invoiceId ? "REIMBURSEMENT" : "PRE_AUTH"),
      invoiceId: presets?.invoiceId ?? "",
      appointmentId: "",
      insurerName: "",
      tpaName: "",
      policyNumber: "",
      groupNumber: "",
      claimedAmount: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (!presetPatient) return;
    if (presetPatient.insuranceProvider) {
      form.setValue("insurerName", presetPatient.insuranceProvider);
    }
    if (presetPatient.insurancePolicyNumber) {
      form.setValue("policyNumber", presetPatient.insurancePolicyNumber);
    }
    if (presetPatient.insuranceGroupNumber) {
      form.setValue("groupNumber", presetPatient.insuranceGroupNumber);
    }
  }, [form, presetPatient]);

  useEffect(() => {
    const amount = presetInvoice?.grandTotal ?? presetInvoice?.total;
    if (typeof amount === "number" && amount >= 0) {
      form.setValue("claimedAmount", amount);
    }
  }, [form, presetInvoice]);

  const onSubmit = async (data: CreateInsuranceClaimFormValues) => {
    try {
      setIsSaving(true);
      const result = await createClaim.mutateAsync({
        patientId: data.patientId,
        claimType: data.claimType,
        invoiceId: data.invoiceId || undefined,
        appointmentId: data.appointmentId || undefined,
        insurerName: data.insurerName,
        tpaName: data.tpaName || undefined,
        policyNumber: data.policyNumber,
        groupNumber: data.groupNumber || undefined,
        claimedAmountCents: Math.round((data.claimedAmount || 0) * 100),
        notes: data.notes || undefined,
      });
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
