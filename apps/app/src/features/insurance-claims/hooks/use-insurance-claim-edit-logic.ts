import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import {
  useInsuranceClaim,
  useUpdateInsuranceClaim,
} from "@workspace/data-access";
import {
  editInsuranceClaimFormSchema,
  type EditInsuranceClaimFormValues,
} from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { centsToMajor } from "@/features/insurance-claims/lib/claim-display";

export const useInsuranceClaimEditLogic = (id: string) => {
  const router = useNavigate();
  const {
    data: claim,
    isPending,
    isError,
    error,
    refetch,
  } = useInsuranceClaim(id);
  const updateClaim = useUpdateInsuranceClaim(id);
  const form = useForm<EditInsuranceClaimFormValues>({
    resolver: zodResolver(editInsuranceClaimFormSchema),
    defaultValues: {
      invoiceId: "",
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
    if (!claim) return;
    form.reset({
      invoiceId: claim.invoiceId ?? "",
      appointmentId: claim.appointmentId ?? "",
      insurerName: claim.insurerName,
      tpaName: claim.tpaName ?? "",
      policyNumber: claim.policyNumber,
      groupNumber: claim.groupNumber ?? "",
      claimedAmount: centsToMajor(claim.claimedAmountCents),
      notes: claim.notes ?? "",
    });
  }, [claim, form]);
  const onSubmit = async (values: EditInsuranceClaimFormValues) => {
    if (!claim?.version) return;
    try {
      await updateClaim.mutateAsync({
        version: claim.version,
        invoiceId: values.invoiceId || null,
        appointmentId: values.appointmentId || null,
        insurerName: values.insurerName,
        tpaName: values.tpaName || null,
        policyNumber: values.policyNumber,
        groupNumber: values.groupNumber || null,
        claimedAmountCents: Math.round(values.claimedAmount * 100),
        notes: values.notes || null,
      });
      toast.success("Insurance claim updated");
      router(`/insurance-claims/${id}`);
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "We could not update this claim. Reload and try again.",
      );
    }
  };
  return {
    claim,
    loading: isPending,
    isError,
    error,
    refetch,
    form,
    onSubmit,
    isSaving: updateClaim.isPending,
    router,
  };
};
