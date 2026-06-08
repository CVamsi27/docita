import { useState } from "react";
import { toast } from "sonner";
import type { useProcessOCR } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { OCRFormData } from "@/features/ocr/types";
import { buildOcrFormData, emptyOcrFormData } from "./use-ocr-helpers";

const INITIAL_EXPANDED_SECTIONS: Record<string, boolean> = {
  patient: true,
  clinical: true,
  vitals: true,
  medications: false,
  labValues: false,
  invoice: false,
};

/**
 * Owns the scan lifecycle: the selected file/preview, the scanned form draft
 * and its confidence/correction metadata, and the section-expansion UI state.
 * Resets `reviewAcknowledged` (owned by the save flow) whenever a fresh scan
 * lands, since a new document invalidates any prior low-confidence sign-off.
 */
export function useOcrScan(params: {
  processOCRMutation: ReturnType<typeof useProcessOCR>;
  setReviewAcknowledged: (value: boolean) => void;
}) {
  const { processOCRMutation, setReviewAcknowledged } = params;

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    INITIAL_EXPANDED_SECTIONS,
  );
  const [formData, setFormData] = useState<OCRFormData>(emptyOcrFormData());
  const [confidenceScores, setConfidenceScores] = useState<Record<string, number>>({});
  const [suggestedCorrections, setSuggestedCorrections] = useState<Record<string, string>>({});
  const [documentType, setDocumentType] = useState<string>("GENERAL");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | File) => {
    const selectedFile = e instanceof File ? e : e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setScanned(false);
    }
  };

  const handleScan = async () => {
    if (!file) return;
    try {
      const formDataObj = new FormData();
      formDataObj.append("file", file);
      const result = await processOCRMutation.mutateAsync(formDataObj);
      const nextFormData = buildOcrFormData(
        result.fields,
        result.firstName,
        result.lastName,
        result.age,
        result.gender,
        result.diagnosis,
        result.phoneNumber,
      );
      setFormData(nextFormData);
      setExpandedSections((prev) => ({
        ...prev,
        invoice:
          nextFormData.invoice.items.length > 0 ||
          nextFormData.invoice.grandTotal.trim().length > 0,
      }));
      if (result.fields?.fieldConfidence) setConfidenceScores(result.fields.fieldConfidence);
      if (result.suggestedCorrections) setSuggestedCorrections(result.suggestedCorrections);
      if (result.documentType) setDocumentType(result.documentType);
      setScanned(true);
      setReviewAcknowledged(false);
      toast.success("Document scanned successfully");
    } catch {
      showUserFacingErrorToast("We could not scan this document. Please try again.");
    }
  };

  const getScore = (key: string): number | undefined => confidenceScores[key];
  const getSection = (key: string): boolean => expandedSections[key] ?? false;
  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const getCorrection = (key: string): string | undefined => suggestedCorrections[key];

  return {
    file,
    previewUrl,
    scanned,
    formData,
    setFormData,
    confidenceScores,
    suggestedCorrections,
    documentType,
    expandedSections,
    handleFileChange,
    handleScan,
    getScore,
    getSection,
    toggleSection,
    getCorrection,
    isScanning: processOCRMutation.isPending,
  };
}
