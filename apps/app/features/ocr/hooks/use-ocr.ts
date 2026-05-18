import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useProcessOCR, useOcrCommitImport } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useRouter } from "next/navigation";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { OcrImportCommitRequest } from "@workspace/types";
import type { OCRFormData } from "@/features/ocr/types";
import {
  emptyOcrInvoiceForm,
  mapOcrFieldsToInvoiceForm,
  buildInvoiceDraftForCommit,
} from "./use-ocr-helpers";

export const useOCR = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { clinicId } = useClinic();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    patient: true, clinical: true, vitals: true, medications: false, labValues: false, invoice: false,
  });

  const processOCRMutation = useProcessOCR();
  const commitOcrMutation = useOcrCommitImport();
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);

  const [formData, setFormData] = useState<OCRFormData>({
    firstName: "", lastName: "", age: "", gender: "MALE", dateOfBirth: "",
    phoneNumber: "", email: "", address: "", bloodType: "", diagnosis: "",
    symptoms: [], allergies: [], medicalHistory: [], medications: [],
    vitals: { bp: "", temp: "", pulse: "", respiratoryRate: "", spO2: "", glucose: "" },
    labValues: { glucose: "", hemoglobin: "", creatinine: "" },
    invoice: emptyOcrInvoiceForm(),
  });

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
      const invoiceFromScan = mapOcrFieldsToInvoiceForm(result.fields);
      setFormData({
        firstName: result.fields?.firstName || result.firstName || "",
        lastName: result.fields?.lastName || result.lastName || "",
        age: result.fields?.age || result.age || "",
        gender: result.fields?.gender || result.gender || "MALE",
        phoneNumber: result.fields?.phoneNumber || result.phoneNumber || "",
        email: result.fields?.email || "",
        dateOfBirth: "", address: "",
        bloodType: result.fields?.bloodType || "",
        diagnosis: result.fields?.diagnosis || result.diagnosis || "",
        symptoms: result.fields?.symptoms || [],
        allergies: result.fields?.allergies || [],
        medicalHistory: result.fields?.medicalHistory || [],
        medications: result.fields?.medications || [],
        vitals: {
          bp: result.fields?.vitals?.bp || result.vitals?.bp || "",
          temp: result.fields?.vitals?.temp || result.vitals?.temp || "",
          pulse: result.fields?.vitals?.pulse || result.vitals?.pulse || "",
          respiratoryRate: result.fields?.vitals?.respiratoryRate || "",
          spO2: result.fields?.vitals?.spO2 || "", glucose: result.fields?.vitals?.glucose || "",
        },
        labValues: { glucose: "", hemoglobin: "", creatinine: "" },
        invoice: invoiceFromScan,
      });
      setExpandedSections((prev) => ({
        ...prev,
        invoice: invoiceFromScan.items.length > 0 || invoiceFromScan.grandTotal.trim().length > 0,
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

  const needsReviewAcknowledgement = useMemo(
    () => scanned && Object.values(confidenceScores).some((s) => typeof s === "number" && s < 0.6),
    [scanned, confidenceScores],
  );

  const handleSave = async () => {
    try {
      if (!clinicId) { showUserFacingErrorToast(null, "Select a facility to continue", "form"); return; }
      if (!user?.id) { showUserFacingErrorToast(null, "Please sign in again to continue", "auth"); return; }
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        showUserFacingErrorToast(null, "Enter the patient's first and last name", "form"); return;
      }
      if (!formData.phoneNumber.trim()) {
        showUserFacingErrorToast(null, "Enter the patient's phone number", "form"); return;
      }
      if (needsReviewAcknowledgement && !reviewAcknowledged) {
        showUserFacingErrorToast(null, "Confirm you have reviewed low-confidence fields before saving", "form"); return;
      }
      const invoiceDraft = buildInvoiceDraftForCommit(formData.invoice);
      if (formData.invoice.saveAsPending && !invoiceDraft) {
        showUserFacingErrorToast(null, "To save a pending invoice, add at least one line with description, quantity, unit price, and total (or leave total blank when quantity and unit price are set), and enter a positive grand total.", "form"); return;
      }
      const dobDate = formData.dateOfBirth.trim().length > 0
        ? new Date(formData.dateOfBirth)
        : new Date(new Date().getFullYear() - (parseInt(formData.age, 10) || 0), 0, 1);
      if (Number.isNaN(dobDate.getTime())) {
        showUserFacingErrorToast(null, "Enter a valid date of birth or age", "form"); return;
      }
      const dobIso = dobDate.toISOString();
      const bpParts = formData.vitals.bp ? formData.vitals.bp.split("/") : [];
      const vitalsPayload: OcrImportCommitRequest["vitals"] = {};
      if (bpParts[0]) vitalsPayload.systolicBP = parseInt(bpParts[0], 10);
      if (bpParts[1]) vitalsPayload.diastolicBP = parseInt(bpParts[1], 10);
      if (formData.vitals.temp.trim()) vitalsPayload.temperature = parseFloat(formData.vitals.temp);
      if (formData.vitals.pulse.trim()) vitalsPayload.pulse = parseInt(formData.vitals.pulse, 10);
      const hasVitals = vitalsPayload.systolicBP !== undefined || vitalsPayload.diastolicBP !== undefined ||
        vitalsPayload.temperature !== undefined || vitalsPayload.pulse !== undefined;
      const medications = formData.medications.length > 0
        ? formData.medications.map((m) => ({ name: m.name.trim(), dosage: m.dosage.trim() || "—", frequency: m.frequency.trim() || "—", route: "PO", duration: "" }))
        : undefined;
      const payload: OcrImportCommitRequest = {
        clinicId, doctorId: user.id,
        firstName: formData.firstName.trim(), lastName: formData.lastName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        gender: formData.gender as "MALE" | "FEMALE" | "OTHER",
        dateOfBirth: dobIso, address: formData.address.trim() || undefined,
        diagnosis: formData.diagnosis.trim() || undefined,
        allergies: formData.allergies.length > 0 ? formData.allergies : undefined,
        medications, vitals: hasVitals ? vitalsPayload : undefined,
        consultationNotes: formData.diagnosis.trim() || undefined,
        acknowledgeReview: needsReviewAcknowledgement ? reviewAcknowledged : undefined,
        invoiceDraft,
      };
      const result = await commitOcrMutation.mutateAsync(payload);
      toast.success("Patient and visit created successfully");
      router.push(`/patients/${result.patientId}`);
    } catch (error) {
      showUserFacingErrorToast(error, "We could not save this record. Please try again.", "save");
    }
  };

  const getScore = (key: string): number | undefined => confidenceScores[key];
  const getSection = (key: string): boolean => expandedSections[key] ?? false;
  const toggleSection = (key: string) => { setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] })); };
  const getCorrection = (key: string): string | undefined => suggestedCorrections[key];

  return {
    file, previewUrl, scanned, formData, setFormData,
    confidenceScores, suggestedCorrections, documentType,
    handleFileChange, handleScan, handleSave,
    getScore, getSection, toggleSection, getCorrection,
    isScanning: processOCRMutation.isPending,
    isSaving: commitOcrMutation.isPending,
    needsReviewAcknowledgement, reviewAcknowledged, setReviewAcknowledged, expandedSections,
  };
};
