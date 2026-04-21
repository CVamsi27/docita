import { useState } from "react";
import { toast } from "sonner";
import { useCreateAppointment } from "@/hooks/api/use-appointments";
import { useProcessOCR } from "@/hooks/api/use-import";
import { useCreatePatient } from "@/hooks/api/use-patients";
import { useAuth } from "@/lib/auth-context";
import { useClinic } from "@/lib/clinic-context";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { OCRFormData } from "@/features/ocr/types";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

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
  });

  const processOCRMutation = useProcessOCR();
  const createPatientMutation = useCreatePatient();
  const createAppointmentMutation = useCreateAppointment();

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
    labValues: {
      glucose: "",
      hemoglobin: "",
      creatinine: "",
    },
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

      setFormData({
        firstName: result.fields?.firstName || result.firstName || "",
        lastName: result.fields?.lastName || result.lastName || "",
        age: result.fields?.age || result.age || "",
        gender: result.fields?.gender || result.gender || "MALE",
        phoneNumber: result.fields?.phoneNumber || result.phoneNumber || "",
        email: result.fields?.email || "",
        dateOfBirth: "",
        address: "",
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
          spO2: result.fields?.vitals?.spO2 || "",
          glucose: result.fields?.vitals?.glucose || "",
        },
        labValues: {
          glucose: "",
          hemoglobin: "",
          creatinine: "",
        },
      });

      if (result.fields?.fieldConfidence) {
        setConfidenceScores(result.fields.fieldConfidence);
      }
      if (result.suggestedCorrections) {
        setSuggestedCorrections(result.suggestedCorrections);
      }
      if (result.documentType) {
        setDocumentType(result.documentType);
      }

      setScanned(true);
      toast.success("Document scanned successfully");
    } catch {
      showUserFacingErrorToast(
        "We could not scan this document. Please try again.",
      );
    }
  };

  const handleSave = async () => {
    try {
      if (!clinicId) {
        showUserFacingErrorToast(null, "Select a facility to continue", "form");
        return;
      }
      if (!user?.id) {
        showUserFacingErrorToast(null, "Please sign in again to continue", "auth");
        return;
      }
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        showUserFacingErrorToast(
          null,
          "Enter the patient's first and last name",
          "form",
        );
        return;
      }
      if (!formData.phoneNumber.trim()) {
        showUserFacingErrorToast(null, "Enter the patient's phone number", "form");
        return;
      }

      const patient = await createPatientMutation.mutateAsync({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        gender: formData.gender as "MALE" | "FEMALE" | "OTHER",
        dateOfBirth: new Date(
          new Date().getFullYear() - (parseInt(formData.age) || 0),
        ).toISOString(),
        address: formData.address || "",
        allergies:
          formData.allergies.length > 0 ? formData.allergies.join(", ") : "",
        medicalHistory: [formData.diagnosis],
        isolationStatus: "NONE",
        fallRisk: false,
      });

      const appointment = await createAppointmentMutation.mutateAsync({
        patientId: patient.id!,
        doctorId: user.id,
        clinicId,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30 * 60000).toISOString(),
        type: "consultation",
        status: "confirmed",
        consultationNotes: "",
        notes: "",
        observations: formData.diagnosis,
        provisionalDiagnosis: "",
        differentialDiagnosis: "",
        clinicalImpression: "",
        finalDiagnosis: "",
        treatmentPlan: "",
        followUpPlan: "",
      });

      if (
        appointment.id &&
        (formData.vitals.bp || formData.vitals.temp || formData.vitals.pulse)
      ) {
        try {
          const bpParts = formData.vitals.bp
            ? formData.vitals.bp.split("/")
            : [];
          const vitalsData = {
            systolicBP: bpParts[0] ? parseInt(bpParts[0]) : undefined,
            diastolicBP: bpParts[1] ? parseInt(bpParts[1]) : undefined,
            temperature: formData.vitals.temp
              ? parseFloat(formData.vitals.temp)
              : undefined,
            pulse: formData.vitals.pulse
              ? parseInt(formData.vitals.pulse)
              : undefined,
          };
          await apiFetch(`/appointments/${appointment.id}/vitals`, {
            method: "POST",
            body: JSON.stringify(vitalsData),
          });
        } catch {
          
        }
      }

      toast.success("Patient and visit created successfully");
      router.push(`/patients/${patient.id}`);
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
    isSaving:
      createPatientMutation.isPending || createAppointmentMutation.isPending,
    expandedSections,
  };
};
