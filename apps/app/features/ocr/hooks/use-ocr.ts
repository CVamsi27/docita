import { useState } from "react";
import { useProcessOCR, useOcrCommitImport } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useRouter } from "next/navigation";
import { useOcrScan } from "./use-ocr-scan";
import { useOcrSave } from "./use-ocr-save";

/**
 * Composes the OCR review flow's two cohesive concerns — scanning a document
 * into a draft (`useOcrScan`) and reviewing/committing that draft
 * (`useOcrSave`) — into the single view-model `OCRPage` consumes.
 * `reviewAcknowledged` is lifted here because scanning resets it (a fresh
 * document invalidates a prior low-confidence sign-off) while saving gates on it.
 */
export const useOCR = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { clinicId } = useClinic();

  const processOCRMutation = useProcessOCR();
  const commitOcrMutation = useOcrCommitImport();
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);

  const scan = useOcrScan({ processOCRMutation, setReviewAcknowledged });
  const save = useOcrSave({
    formData: scan.formData,
    scanned: scan.scanned,
    confidenceScores: scan.confidenceScores,
    reviewAcknowledged,
    setReviewAcknowledged,
    commitOcrMutation,
    clinicId,
    userId: user?.id,
    router,
  });

  return {
    ...scan,
    ...save,
  };
};
