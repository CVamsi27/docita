import { useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { useOcrCommitImport } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { OCRFormData } from "@/features/ocr/types";
import { buildOcrSavePayload } from "./use-ocr-helpers";
import { getOcrSaveBlocker } from "./use-ocr-validation";

/**
 * Owns the review-acknowledgement gate and the commit flow: blocks low-
 * confidence saves until acknowledged, builds the commit payload, persists
 * the reviewed draft as a patient + visit, and navigates to the new record.
 */
export function useOcrSave(params: {
  formData: OCRFormData;
  scanned: boolean;
  confidenceScores: Record<string, number>;
  reviewAcknowledged: boolean;
  setReviewAcknowledged: (value: boolean) => void;
  commitOcrMutation: ReturnType<typeof useOcrCommitImport>;
  clinicId: string | null;
  userId: string | undefined;
  router: ReturnType<typeof useRouter>;
}) {
  const {
    formData, scanned, confidenceScores, reviewAcknowledged, setReviewAcknowledged,
    commitOcrMutation, clinicId, userId, router,
  } = params;

  const needsReviewAcknowledgement = useMemo(
    () =>
      scanned &&
      Object.values(confidenceScores).some((s) => typeof s === "number" && s < 0.6),
    [scanned, confidenceScores],
  );

  const handleSave = async () => {
    try {
      const blocker = getOcrSaveBlocker({
        clinicId,
        userId,
        formData,
        needsReviewAcknowledgement,
        reviewAcknowledged,
      });
      if (blocker) {
        showUserFacingErrorToast(null, blocker.message, blocker.category);
        return;
      }
      if (!clinicId || !userId) return;
      const payload = buildOcrSavePayload(formData, clinicId, userId, needsReviewAcknowledgement, reviewAcknowledged);
      if (payload.invoiceDraft === undefined && formData.invoice.saveAsPending) return;
      const result = await commitOcrMutation.mutateAsync(payload);
      toast.success("Patient and visit created successfully");
      router.push(`/patients/${result.patientId}`);
    } catch (error) {
      showUserFacingErrorToast(error, "We could not save this record. Please try again.", "save");
    }
  };

  return {
    handleSave,
    needsReviewAcknowledgement,
    reviewAcknowledged,
    setReviewAcknowledged,
    isSaving: commitOcrMutation.isPending,
  };
}
