import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useProcessOCR, useOcrCommitImport } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useRouter } from "next/navigation";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { OCRFormData } from "@/features/ocr/types";
import {
  emptyOcrInvoiceForm,
  buildOcrFormData,
  buildOcrSavePayload,
} from "./use-ocr-helpers";
import { getOcrSaveBlocker } from "./use-ocr-validation";

export const useOCR = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { clinicId } = useClinic();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    patient: true,
    clinical: true,
    vitals: true,
    medications: false,
    labValues: false,
    invoice: false,
  });

  const processOCRMutation = useProcessOCR();
  const commitOcrMutation = useOcrCommitImport();
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);

  const [formData, setFormData] = useState<OCRFormData>({
    firstName: "",
    lastName: "",
    age: "",
    gender: "MALE",
    dateOfBirth: "",
    phoneNumber: "",
    email: "",
    address: "",
    bloodType: "",
    diagnosis: "",
    symptoms: [],
    allergies: [],
    medicalHistory: [],
    medications: [],
    vitals: {
      bp: "",
      temp: "",
      pulse: "",
      respiratoryRate: "",
      spO2: "",
      glucose: "",
    },
    labValues: { glucose: "", hemoglobin: "", creatinine: "" },
    invoice: emptyOcrInvoiceForm(),
  });

  const [confidenceScores, setConfidenceScores] = useState<
    Record<string, number>
  >({});
  const [suggestedCorrections, setSuggestedCorrections] = useState<
    Record<string, string>
  >({});
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
      if (result.fields?.fieldConfidence)
        setConfidenceScores(result.fields.fieldConfidence);
      if (result.suggestedCorrections)
        setSuggestedCorrections(result.suggestedCorrections);
      if (result.documentType) setDocumentType(result.documentType);
      setScanned(true);
      setReviewAcknowledged(false);
      toast.success("Document scanned successfully");
    } catch {
      showUserFacingErrorToast(
        "We could not scan this document. Please try again.",
      );
    }
  };

  const needsReviewAcknowledgement = useMemo(
    () =>
      scanned &&
      Object.values(confidenceScores).some(
        (s) => typeof s === "number" && s < 0.6,
      ),
    [scanned, confidenceScores],
  );

  const handleSave = async () => {
    try {
      const activeClinicId = clinicId;
      const activeUserId = user?.id;
      const blocker = getOcrSaveBlocker({
        clinicId: activeClinicId,
        userId: activeUserId,
        formData,
        needsReviewAcknowledgement,
        reviewAcknowledged,
      });
      if (blocker) {
        showUserFacingErrorToast(null, blocker.message, blocker.category);
        return;
      }
      if (!activeClinicId || !activeUserId) return;
      const payload = buildOcrSavePayload(
        formData,
        activeClinicId,
        activeUserId,
        needsReviewAcknowledgement,
        reviewAcknowledged,
      );
      if (payload.invoiceDraft === undefined && formData.invoice.saveAsPending)
        return;
      const result = await commitOcrMutation.mutateAsync(payload);
      toast.success("Patient and visit created successfully");
      router.push(`/patients/${result.patientId}`);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not save this record. Please try again.",
        "save",
      );
    }
  };

  const getScore = (key: string): number | undefined => confidenceScores[key];
  const getSection = (key: string): boolean => expandedSections[key] ?? false;
  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const getCorrection = (key: string): string | undefined =>
    suggestedCorrections[key];

  return {
    file,
    previewUrl,
    scanned,
    formData,
    setFormData,
    confidenceScores,
    suggestedCorrections,
    documentType,
    handleFileChange,
    handleScan,
    handleSave,
    getScore,
    getSection,
    toggleSection,
    getCorrection,
    isScanning: processOCRMutation.isPending,
    isSaving: commitOcrMutation.isPending,
    needsReviewAcknowledgement,
    reviewAcknowledged,
    setReviewAcknowledged,
    expandedSections,
  };
};
