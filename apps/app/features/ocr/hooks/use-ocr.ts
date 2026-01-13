import { useState } from "react";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export const useOCR = () => {
  const router = useRouter();
  const { user } = useAuth();

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

  // Mutations
  const processOCRMutation = apiHooks.useProcessOCR();
  const createPatientMutation = apiHooks.useCreatePatient();
  const createAppointmentMutation = apiHooks.useCreateAppointment();

  // Enhanced Form State with Confidence Scores and Suggestions
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "MALE",
    phoneNumber: "",
    email: "",
    bloodType: "",
    diagnosis: "",
    symptoms: [] as string[],
    allergies: [] as string[],
    medicalHistory: [] as string[],
    medications: [] as Array<{
      name: string;
      dosage: string;
      frequency: string;
    }>,
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

      // Update form data from OCR result
      setFormData({
        firstName: result.fields?.firstName || result.firstName || "",
        lastName: result.fields?.lastName || result.lastName || "",
        age: result.fields?.age || result.age || "",
        gender: result.fields?.gender || result.gender || "MALE",
        phoneNumber: result.fields?.phoneNumber || result.phoneNumber || "",
        email: result.fields?.email || "",
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

      // Set confidence scores and suggestions from enhanced response
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
      toast.error("Failed to scan document");
    }
  };

  const handleSave = async () => {
    try {
      // 1. Create Patient
      const patient = await createPatientMutation.mutateAsync({
        firstName: formData.firstName || "Unknown",
        lastName: formData.lastName || "",
        phoneNumber: formData.phoneNumber || "0000000000",
        gender: formData.gender as "MALE" | "FEMALE" | "OTHER",
        dateOfBirth: new Date(
          new Date().getFullYear() - (parseInt(formData.age) || 0),
        ).toISOString(),
        medicalHistory: [formData.diagnosis],
        isolationStatus: "NONE",
        fallRisk: false,
      });

      // 2. Create Appointment (Visit)
      const appointment = await createAppointmentMutation.mutateAsync({
        patientId: patient.id!,
        doctorId: user?.id || "default-doctor-id",
        clinicId: "default-clinic-id",
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30 * 60000).toISOString(),
        type: "consultation",
        status: "confirmed",
        observations: formData.diagnosis,
      });

      // 3. Save Vitals separately if appointment was created successfully
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
          console.warn(
            "Failed to save vitals, but patient and appointment were created",
          );
        }
      }

      toast.success("Patient and visit created successfully");
      router.push(`/patients/${patient.id}`);
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save record. Please try again.";
      toast.error(errorMessage);
    }
  };

  // Helpers
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
