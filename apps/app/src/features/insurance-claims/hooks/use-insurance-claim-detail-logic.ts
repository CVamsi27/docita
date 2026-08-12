import { useState } from "react";
import { toast } from "sonner";
import {
  useInsuranceClaim,
  useAttachableClaimDocuments,
  useAttachClaimDocument,
  useTransitionInsuranceClaim,
} from "@workspace/data-access";
import type { ClaimStatus } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export const useInsuranceClaimDetailLogic = (id: string) => {
  const {
    data: claim,
    isPending,
    isError,
    error,
    refetch,
  } = useInsuranceClaim(id);
  const transition = useTransitionInsuranceClaim(id);
  const attachDocument = useAttachClaimDocument(id);
  const { data: attachableDocuments = [] } = useAttachableClaimDocuments(id);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const runTransition = async (
    targetStatus: ClaimStatus,
    opts?: {
      approvedAmount?: number;
      patientResponsibility?: number;
      denialReason?: string;
      note?: string;
    },
  ) => {
    if (!claim?.version) return;
    try {
      setIsTransitioning(true);
      await transition.mutateAsync({
        targetStatus,
        version: claim.version,
        approvedAmountCents:
          opts?.approvedAmount !== undefined
            ? Math.round(opts.approvedAmount * 100)
            : undefined,
        patientResponsibilityCents:
          opts?.patientResponsibility !== undefined
            ? Math.round(opts.patientResponsibility * 100)
            : undefined,
        denialReason: opts?.denialReason,
        note: opts?.note,
      });
      toast.success("Claim updated");
      await refetch();
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "We could not update this claim. Reload and try again.",
      );
    } finally {
      setIsTransitioning(false);
    }
  };
  const handleAttachDocument = async (documentId: string) => {
    try {
      await attachDocument.mutateAsync({ documentId });
      toast.success("Document attached");
      await refetch();
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "We could not attach this document. Reload and try again.",
      );
    }
  };
  return {
    claim,
    loading: isPending,
    isError,
    error,
    refetch,
    runTransition,
    isTransitioning,
    attachableDocuments,
    handleAttachDocument,
    isAttachingDocument: attachDocument.isPending,
  };
};
