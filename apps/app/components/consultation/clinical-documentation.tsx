"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  FlaskConical,
  HeartPulse,
  Info,
  PanelLeft,
  Plus,
  Save,
  Stethoscope,
  X,
} from "lucide-react";
import { SearchableSelect } from "@/components/common/searchable-select";
import { PatientMedicalHistory } from "@/components/patients/patient-medical-history";
import { useVitalsForm } from "@/hooks/use-vitals-form";
import { usePrescriptionForm } from "@/hooks/use-prescription-form";
import { useInvoiceForm } from "@/hooks/use-invoice-form";
import { MedicineAutocomplete } from "@/components/medicines/medicine-autocomplete";
import { IcdCodeSearch } from "@/components/medical-coding/icd-code-search";
import { DiagnosisList } from "@/components/medical-coding/diagnosis-list";
import { CptCodeSearch } from "@/components/medical-coding/cpt-code-search";
import { ProcedureList } from "@/components/medical-coding/procedure-list";
import { PrescriptionTemplateManager } from "@/components/prescription/prescription-template-manager";
import { ClinicalExamination } from "@/components/consultation/clinical-examination";
import { ClinicalSuggestions } from "@/components/consultation/clinical-suggestions";
import { ChiefComplaintEnhanced } from "@/components/consultation/chief-complaint-enhanced";
import type {
  CptCode,
  Diagnosis,
  IcdCode,
  Medication,
  PrescriptionTemplate,
  Procedure,
} from "@workspace/types";
// eslint-disable-next-line no-duplicate-imports
import { ROUTE_OPTIONS } from "@workspace/types";
import { apiHooks } from "@/lib/api-hooks";
import { api } from "@/lib/api-client";
import { useFormOptions } from "@/lib/app-config-context";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDistanceToNow } from "date-fns";

const _APPOINTMENT_PRIORITY_COLORS: Record<string, string> = {
  ROUTINE: "bg-blue-100",
  URGENT: "bg-yellow-100",
  EMERGENCY: "bg-red-100",
};

// Define types locally since they may not be exported yet
interface GeneralExamination {
  gcs?: number;
  consciousness?: string;
  orientation?: string;
  pallor?: boolean;
  icterus?: boolean;
  cyanosis?: boolean;
  clubbing?: boolean;
  lymphadenopathy?: boolean;
  edema?: boolean;
  pallorNotes?: string;
  icterusNotes?: string;
  cyanosisNotes?: string;
  clubbingNotes?: string;
  lymphadenopathyNotes?: string;
  edemaLocation?: string;
  nutritionStatus?: string;
  hydrationStatus?: string;
  generalNotes?: string;
}

interface SystemicExamination {
  cvs?: {
    heartRate?: number;
    rhythm?: string;
    heartSounds?: string;
    jvp?: string;
    peripheralPulses?: string;
    notes?: string;
  };
  rs?: {
    respiratoryRate?: number;
    breathSounds?: string;
    additionalSounds?: string;
    chestMovement?: string;
    percussion?: string;
    notes?: string;
  };
  pa?: {
    shape?: string;
    tenderness?: boolean;
    tendernessLocation?: string;
    organomegaly?: string;
    bowelSounds?: string;
    ascites?: boolean;
    notes?: string;
  };
  cns?: {
    consciousness?: string;
    cranialNerves?: string;
    motorFunction?: string;
    sensoryFunction?: string;
    reflexes?: string;
    coordination?: string;
    notes?: string;
  };
  mss?: {
    gait?: string;
    jointExamination?: string;
    muscleStrength?: string;
    deformities?: string;
    notes?: string;
  };
  skin?: {
    color?: string;
    texture?: string;
    lesions?: string;
    rashes?: string;
    notes?: string;
  };
  localExamination?: string;
  additionalNotes?: string;
}

interface ClinicalInvestigation {
  id?: string;
  name: string;
  category?: "LABORATORY" | "IMAGING" | "SPECIAL" | "OTHER";
  status?: "ORDERED" | "PENDING" | "COMPLETED" | "CANCELLED";
  result?: string;
  normalRange?: string;
  notes?: string;
  orderedAt?: string | Date;
  completedAt?: string | Date;
}

export interface ClinicalDocumentationProps {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  defaultTab?: TabValue;
  onSave?: () => void;
  isFocusMode?: boolean;
  onToggleFocus?: () => void;
  clinicType?: string;
}

type TabValue =
  | "chief-complaint"
  | "history"
  | "examination"
  | "diagnosis"
  | "treatment";

// Clinical documentation state
interface ClinicalNoteData {
  // Subjective
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  reviewOfSystems: string;

  // Objective
  generalExamination: GeneralExamination;
  systemicExamination: SystemicExamination;

  // Assessment
  provisionalDiagnosis: string;
  differentialDiagnosis: string;
  clinicalImpression: string;

  // Plan
  investigations: ClinicalInvestigation[];
  finalDiagnosis: string;
  treatmentPlan: string;
  followUpPlan: string;
}

export function ClinicalDocumentation({
  appointmentId,
  patientId,
  doctorId,
  defaultTab = "chief-complaint",
  onSave,
  isFocusMode,
  onToggleFocus,
  clinicType,
}: ClinicalDocumentationProps) {
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { user } = useAuth();

  // Get form options from config
  const invoiceStatusOptions = useFormOptions("invoiceStatus");

  // Fetch patient data with full medical history
  const { data: patientData } = apiHooks.usePatient(patientId);

  // Diagnosis State
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

  // Procedure State
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  // Template State
  const { data: templates = [], refetch: loadTemplates } =
    apiHooks.useTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  // Template field state can be added when template feature is fully implemented

  // Clinical Note State
  const [clinicalNote, setClinicalNote] = useState<ClinicalNoteData>({
    chiefComplaint: "",
    historyOfPresentIllness: "",
    pastMedicalHistory: "",
    reviewOfSystems: "",
    generalExamination: {},
    systemicExamination: {},
    provisionalDiagnosis: "",
    differentialDiagnosis: "",
    clinicalImpression: "",
    investigations: [],
    finalDiagnosis: "",
    treatmentPlan: "",
    followUpPlan: "",
  });

  // Load existing appointment data
  const { data: appointmentData } = apiHooks.useAppointment(appointmentId);

  // Populate clinical note from existing appointment data
  useEffect(() => {
    if (appointmentData) {
      // Use type assertion since the types may not be synced yet
      const data = appointmentData as Record<string, unknown>;
      setClinicalNote({
        chiefComplaint: (data.chiefComplaint as string) || "",
        historyOfPresentIllness: (data.historyOfPresentIllness as string) || "",
        pastMedicalHistory: (data.pastMedicalHistory as string) || "",
        reviewOfSystems: (data.reviewOfSystems as string) || "",
        generalExamination:
          (data.generalExamination as GeneralExamination) || {},
        systemicExamination:
          (data.systemicExamination as SystemicExamination) || {},
        provisionalDiagnosis: (data.provisionalDiagnosis as string) || "",
        differentialDiagnosis: (data.differentialDiagnosis as string) || "",
        clinicalImpression: (data.clinicalImpression as string) || "",
        investigations: (data.investigations as ClinicalInvestigation[]) || [],
        finalDiagnosis: (data.finalDiagnosis as string) || "",
        treatmentPlan: (data.treatmentPlan as string) || "",
        followUpPlan: (data.followUpPlan as string) || "",
      });

      // Load diagnoses if available
      if (data.diagnoses) {
        setDiagnoses(data.diagnoses as Diagnosis[]);
      }
      if (data.procedures) {
        setProcedures(data.procedures as Procedure[]);
      }
    }
  }, [appointmentData]);

  // Diagnosis State - moved after appointmentData useEffect
  // const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

  // Procedure State - moved after appointmentData useEffect
  // const [procedures, setProcedures] = useState<Procedure[]>([]);

  // Template State - moved after appointmentData useEffect
  // const { data: templates = [], refetch: loadTemplates } =
  //   apiHooks.useTemplates();
  // const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  // const [dynamicFields, setDynamicFields] = useState<Record<string, string>>(
  //   {},
  // );

  // Prepare template options for searchable select
  const templateOptions = useMemo(() => {
    const options: { value: string; label: string; description?: string }[] = [
      { value: "none", label: "None (Standard)" },
    ];
    templates.forEach((t) => {
      options.push({
        value: t.id,
        label: t.name,
        description: t.speciality,
      });
    });
    return options;
  }, [templates]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    // Reset form when template changes (will be re-initialized on render)
  };

  const queryClient = useQueryClient();
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const [saveTrigger, setSaveTrigger] = useState(0);
  const debouncedSaveTrigger = useDebounce(saveTrigger, 2000);

  const updateClinicalNote = (
    field: keyof ClinicalNoteData,
    value: unknown,
  ) => {
    setClinicalNote((prev) => ({
      ...prev,
      [field]: value,
    }));
    setDirtyFields((prev) => new Set(prev).add(field));
    setSaveTrigger((prev) => prev + 1);
  };

  // Save clinical note to API
  const saveClinicalNote = useCallback(
    async (isAutoSave = false) => {
      if (isAutoSave) {
        setIsAutoSaving(true);
      } else {
        setIsSaving(true);
      }

      try {
        // Prepare payload with observations sync for backward compatibility
        const payload = {
          chiefComplaint: clinicalNote.chiefComplaint,
          historyOfPresentIllness: clinicalNote.historyOfPresentIllness,
          pastMedicalHistory: clinicalNote.pastMedicalHistory,
          reviewOfSystems: clinicalNote.reviewOfSystems,
          generalExamination: clinicalNote.generalExamination,
          systemicExamination: clinicalNote.systemicExamination,
          provisionalDiagnosis: clinicalNote.provisionalDiagnosis,
          differentialDiagnosis: clinicalNote.differentialDiagnosis,
          clinicalImpression: clinicalNote.clinicalImpression,
          investigations: clinicalNote.investigations,
          finalDiagnosis: clinicalNote.finalDiagnosis,
          treatmentPlan: clinicalNote.treatmentPlan,
          followUpPlan: clinicalNote.followUpPlan,
          // Sync chiefComplaint to observations for backward compatibility
          observations:
            clinicalNote.chiefComplaint || clinicalNote.clinicalImpression,
        };

        console.log("💾 Saving clinical note:", {
          appointmentId,
          isAutoSave,
          payload,
        });

        const response = await api.patch(
          `/appointments/${appointmentId}`,
          payload,
        );

        console.log("✅ Save response:", response);

        if (!response || (response as { error?: string }).error) {
          throw new Error(
            (response as { error?: string }).error || "Save failed",
          );
        }

        // Optimized cache invalidation - broader scope, single operation
        await queryClient.invalidateQueries({
          queryKey: ["appointments"],
          refetchType: isAutoSave ? "none" : "active",
        });

        // Also invalidate patient queries to update patient view
        if (patientId) {
          await queryClient.invalidateQueries({
            queryKey: ["patients"],
            refetchType: isAutoSave ? "none" : "active",
          });
        }

        setLastSaved(new Date());
        setDirtyFields(new Set());

        if (!isAutoSave) {
          toast.success("Clinical documentation saved");
        }
        onSave?.();
      } catch (error) {
        console.error("Failed to save clinical note:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save";

        if (!isAutoSave) {
          toast.error("Failed to save clinical documentation", {
            description: errorMessage,
            action: {
              label: "Retry",
              onClick: () => saveClinicalNote(false),
            },
          });
        }
      } finally {
        if (isAutoSave) {
          setIsAutoSaving(false);
        } else {
          setIsSaving(false);
        }
      }
    },
    [appointmentId, patientId, clinicalNote, queryClient, onSave],
  );

  // Debounced auto-save - triggers 2 seconds after last edit
  useEffect(() => {
    if (dirtyFields.size > 0 && debouncedSaveTrigger > 0) {
      saveClinicalNote(true);
    }
  }, [debouncedSaveTrigger, dirtyFields.size, saveClinicalNote]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveClinicalNote(false);
      }

      // Cmd/Ctrl + 1-5 to switch tabs
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        const tabs: TabValue[] = [
          "chief-complaint",
          "history",
          "examination",
          "diagnosis",
          "treatment",
        ];
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
          setActiveTab(tabs[tabIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveClinicalNote]);

  const handleAddDiagnosis = async (code: IcdCode) => {
    if (diagnoses.some((d) => d.icdCode?.code === code.code)) {
      toast.error("Diagnosis already added");
      return;
    }

    const newDiagnosis: Diagnosis = {
      id: Math.random().toString(36).substr(2, 9),
      icdCodeId: code.id || code.code,
      icdCode: code,
      isPrimary: diagnoses.length === 0,
      createdAt: new Date().toISOString(),
    };

    // Optimistically update UI
    setDiagnoses([...diagnoses, newDiagnosis]);

    try {
      // Persist to backend
      await api.post(`/appointments/${appointmentId}/diagnoses`, {
        icdCodeId: code.id,
        notes: "",
        isPrimary: diagnoses.length === 0,
      });
      toast.success("Diagnosis added");
    } catch (error) {
      // Rollback on error
      setDiagnoses(diagnoses);
      console.error("Failed to add diagnosis:", error);
      toast.error("Failed to add diagnosis. Please try again.");
    }
  };

  const handleRemoveDiagnosis = (index: number) => {
    const newDiagnoses = [...diagnoses];
    newDiagnoses.splice(index, 1);

    if (
      diagnoses[index]?.isPrimary &&
      newDiagnoses.length > 0 &&
      newDiagnoses[0]
    ) {
      newDiagnoses[0].isPrimary = true;
    }

    setDiagnoses(newDiagnoses);
  };

  const handleUpdateDiagnosisNote = (index: number, note: string) => {
    const newDiagnoses = [...diagnoses];
    if (newDiagnoses[index]) {
      newDiagnoses[index].notes = note;
    }
    setDiagnoses(newDiagnoses);
  };

  const handleTogglePrimaryDiagnosis = (index: number) => {
    const newDiagnoses = diagnoses.map((d, i) => ({
      ...d,
      isPrimary: i === index,
    }));
    setDiagnoses(newDiagnoses);
  };

  const handleAddProcedure = (code: CptCode) => {
    if (procedures.some((p) => p.cptCode?.code === code.code)) {
      toast.error("Procedure already added");
      return;
    }

    const newProcedure: Procedure = {
      id: Math.random().toString(36).substr(2, 9),
      cptCodeId: code.id || code.code,
      cptCode: code,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProcedures([...procedures, newProcedure]);
    toast.success("Procedure added");

    if (code.price && code.price > 0) {
      addItem({
        description: `${code.code} - ${code.description}`,
        quantity: 1,
        price: code.price,
      });
      toast.success("Added to invoice");
    }
  };

  const handleRemoveProcedure = (index: number) => {
    const newProcedures = [...procedures];
    newProcedures.splice(index, 1);
    setProcedures(newProcedures);
  };

  const handleAddToInvoice = (procedure: Procedure) => {
    const price = procedure.cptCode.price ?? 0;
    if (price > 0) {
      const alreadyInInvoice = invoiceItems.some((item) =>
        item.description.includes(procedure.cptCode.code),
      );

      if (alreadyInInvoice) {
        toast.info("This procedure is already in the invoice");
        return;
      }

      addItem({
        description: `${procedure.cptCode.code} - ${procedure.cptCode.description}`,
        quantity: 1,
        price,
      });
      toast.success("Added to invoice");
    } else {
      toast.info("This procedure has no price associated");
    }
  };

  const handleApplyPrescriptionTemplate = (template: PrescriptionTemplate) => {
    template.medications.forEach(() => {
      addMedication();
    });
    setTimeout(() => {
      template.medications.forEach((med: Medication, index: number) => {
        updateMedication(index, "name", med.name);
        updateMedication(index, "dosage", med.dosage);
        updateMedication(index, "frequency", med.frequency);
        updateMedication(index, "duration", med.duration);
      });
      if (template.instructions) {
        setRxInstructions(template.instructions);
      }
    }, 100);
  };

  const handleSaveAsTemplate = async () => {
    if (medications.length === 0) {
      toast.error("Add at least one medication to save as template");
      return;
    }

    const templateName = prompt("Enter a name for this template:");
    if (!templateName) return;

    try {
      await api.post("/prescription-templates", {
        name: templateName,
        medications: medications,
        instructions: rxInstructions,
      });
      toast.success("Template saved successfully");
      loadTemplates();
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Failed to save template");
    }
  };

  // Add investigation
  const addInvestigation = () => {
    const newInvestigation: ClinicalInvestigation = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      category: "LABORATORY",
      status: "ORDERED",
    };
    updateClinicalNote("investigations", [
      ...clinicalNote.investigations,
      newInvestigation,
    ]);
  };

  const updateInvestigation = (
    index: number,
    field: keyof ClinicalInvestigation,
    value: unknown,
  ) => {
    const newInvestigations = [...clinicalNote.investigations];
    if (newInvestigations[index]) {
      // Use object spread to update the field
      newInvestigations[index] = {
        ...newInvestigations[index],
        [field]: value,
      };
    }
    updateClinicalNote("investigations", newInvestigations);
  };

  const removeInvestigation = (index: number) => {
    const newInvestigations = [...clinicalNote.investigations];
    newInvestigations.splice(index, 1);
    updateClinicalNote("investigations", newInvestigations);
  };

  // Vitals Hook
  const {
    loading: vitalsLoading,
    formData: vitalsData,
    updateField: updateVitals,
    handleSubmit: handleVitalsSubmit,
  } = useVitalsForm({
    appointmentId,
    onVitalsSaved: onSave,
  });

  // Prescription Hook
  const {
    loading: rxLoading,
    instructions: rxInstructions,
    setInstructions: setRxInstructions,
    medications,
    addMedication,
    removeMedication,
    updateMedication,
    handleSubmit: handleRxSubmit,
  } = usePrescriptionForm({
    appointmentId,
    patientId,
    doctorId,
    onPrescriptionSaved: onSave,
  });

  // Invoice Hook
  const {
    loading: invLoading,
    status: invStatus,
    setStatus: setInvStatus,
    items: invoiceItems,
    addItem,
    removeItem: removeInvoiceItem,
    updateItem: updateInvoiceItem,
    calculateTotal: calculateInvTotal,
    handleSubmit: handleInvSubmit,
  } = useInvoiceForm({
    appointmentId,
    patientId,
    doctorSpecialization:
      ((
        appointmentData?.doctor as
          | {
              specialization?: string;
              email?: string;
              phoneNumber?: string;
              role?: string;
              registrationNumber?: string;
              licenseNumber?: string;
            }
          | undefined
      )?.specialization as any) || "OTHER", // eslint-disable-line @typescript-eslint/no-explicit-any
    doctorName: appointmentData?.doctor?.name,
    doctorEmail: (
      appointmentData?.doctor as
        | {
            specialization?: string;
            email?: string;
            phoneNumber?: string;
            role?: string;
            registrationNumber?: string;
            licenseNumber?: string;
          }
        | undefined
    )?.email,
    doctorPhone: (
      appointmentData?.doctor as
        | {
            specialization?: string;
            email?: string;
            phoneNumber?: string;
            role?: string;
            registrationNumber?: string;
            licenseNumber?: string;
          }
        | undefined
    )?.phoneNumber,
    doctorRole: (
      appointmentData?.doctor as
        | {
            specialization?: string;
            email?: string;
            phoneNumber?: string;
            role?: string;
            registrationNumber?: string;
            licenseNumber?: string;
          }
        | undefined
    )?.role,
    doctorRegistrationNumber: (
      appointmentData?.doctor as
        | {
            specialization?: string;
            email?: string;
            phoneNumber?: string;
            role?: string;
            registrationNumber?: string;
            licenseNumber?: string;
          }
        | undefined
    )?.registrationNumber,
    doctorLicenseNumber: (
      appointmentData?.doctor as
        | {
            specialization?: string;
            email?: string;
            phoneNumber?: string;
            role?: string;
            registrationNumber?: string;
            licenseNumber?: string;
          }
        | undefined
    )?.licenseNumber,
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Allergy Alert Banner */}
      {patientData?.allergies && (
        <div className="mx-1 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800 animate-in fade-in slide-in-from-top-2 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">ALLERGY ALERT:</span>
            <span className="ml-2 font-medium">{patientData.allergies}</span>
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
        className="flex-1 flex flex-col h-full overflow-x-hidden"
      >
        {/* Sticky Header with Quick Vitals and Save */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between px-6 py-2">
            {/* Quick Vitals Strip */}
            <div className="flex items-center gap-4 text-sm">
              {onToggleFocus && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleFocus}
                  className="h-8 w-8 p-0 mr-2 md:hidden"
                >
                  {isFocusMode ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeft className="h-4 w-4" />
                  )}
                </Button>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <HeartPulse className="h-4 w-4 text-red-500" />
                <span className="font-medium text-foreground">
                  {vitalsData.systolicBP && vitalsData.diastolicBP
                    ? `${vitalsData.systolicBP}/${vitalsData.diastolicBP}`
                    : "--/--"}
                </span>
                <span className="text-xs">BP</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-foreground">
                  {vitalsData.pulse || "--"}
                </span>
                <span className="text-xs">bpm</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">
                  {vitalsData.temperature || "--"}
                </span>
                <span className="text-xs">°F</span>
              </div>
            </div>

            {/* Save Section with Auto-save Status */}
            <div className="flex items-center gap-3">
              {/* Auto-save status indicator */}
              {isAutoSaving && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
                  <span>Auto-saving...</span>
                </div>
              )}
              {!isAutoSaving && lastSaved && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>
                    Saved{" "}
                    {new Date(lastSaved).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}

              {/* Keyboard shortcut hint */}
              <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border border-border rounded">
                  ⌘
                </kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border border-border rounded">
                  S
                </kbd>
              </div>

              {/* Sticky Save Button with Status */}
              <div className="flex items-center gap-3">
                {isAutoSaving && (
                  <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Saving...
                  </span>
                )}
                {lastSaved && !isAutoSaving && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
                  </span>
                )}
                <Button
                  onClick={() => saveClinicalNote(false)}
                  disabled={
                    isSaving ||
                    vitalsLoading ||
                    rxLoading ||
                    invLoading ||
                    isAutoSaving
                  }
                  size="sm"
                  className="gap-2 shadow-sm"
                >
                  {isSaving || vitalsLoading || rxLoading || invLoading ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 bg-muted/5 overflow-x-auto">
          <TabsList className="h-12 w-full justify-start bg-transparent p-0 gap-4 flex-nowrap min-w-max">
            <TabsTrigger
              value="chief-complaint"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 pb-0"
            >
              <div className="flex items-center gap-2 py-2">
                <ClipboardList className="h-4 w-4" />
                <span>Chief Complaint</span>
              </div>
            </TabsTrigger>
            {clinicType !== "DENTAL" && (
              <>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 pb-0"
                >
                  <div className="flex items-center gap-2 py-2">
                    <FileText className="h-4 w-4" />
                    <span>History</span>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="examination"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 pb-0"
                >
                  <div className="flex items-center gap-2 py-2">
                    <Stethoscope className="h-4 w-4" />
                    <span>Examination</span>
                  </div>
                </TabsTrigger>
              </>
            )}
            <TabsTrigger
              value="diagnosis"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 pb-0"
            >
              <div className="flex items-center gap-2 py-2">
                <Activity className="h-4 w-4" />
                <span>Diagnosis</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="treatment"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 pb-0"
            >
              <div className="flex items-center gap-2 py-2">
                <FlaskConical className="h-4 w-4" />
                <span>Investigations & Plan</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Chief Complaint Tab */}
          <TabsContent value="chief-complaint" className="mt-0 p-6">
            <div className="space-y-6">
              {/* Enhanced Chief Complaint Component */}
              <ChiefComplaintEnhanced
                value={clinicalNote.chiefComplaint}
                onChange={(value) =>
                  updateClinicalNote("chiefComplaint", value)
                }
              />

              {/* Clinical Decision Support - Smart Suggestions */}
              {clinicalNote.chiefComplaint && (
                <ClinicalSuggestions
                  chiefComplaint={clinicalNote.chiefComplaint}
                  onApplySuggestion={(suggestion) => {
                    if (suggestion.type === "investigation") {
                      const newInvestigation = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: suggestion.text,
                        category: "LABORATORY" as const,
                        status: "ORDERED" as const,
                        notes: suggestion.reason || "",
                      };
                      updateClinicalNote("investigations", [
                        ...clinicalNote.investigations,
                        newInvestigation,
                      ]);
                      toast.success(`Added investigation: ${suggestion.text}`);
                    }
                  }}
                />
              )}

              {/* Clinical Template Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Clinical Template (Optional)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Use specialty-specific templates to streamline documentation
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <SearchableSelect
                        options={templateOptions}
                        value={selectedTemplateId}
                        onValueChange={handleTemplateChange}
                        placeholder="Select a template..."
                        searchPlaceholder="Search templates..."
                        emptyMessage="No templates found."
                        className="bg-background"
                      />
                    </div>
                    {selectedTemplateId && selectedTemplateId !== "none" && (
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {
                          templates.find((t) => t.id === selectedTemplateId)
                            ?.speciality
                        }
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {/* History Tab */}
          {clinicType !== "DENTAL" && (
            <TabsContent value="history" className="mt-0 p-6">
              <div className="space-y-6">
                {patientData && (
                  <PatientMedicalHistory patient={patientData} readOnly={false} />
                )}

                {/* History of Present Illness */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      History of Present Illness (HPI){" "}
                      <span className="text-destructive">*</span>
                    </CardTitle>
                    <CardDescription>
                      Detailed chronological description using OLDCARTS format
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Onset, Location, Duration, Character, Aggravating/Relieving factors, Radiation, Timing, Severity. Include pertinent positives and negatives."
                      value={clinicalNote.historyOfPresentIllness}
                      onChange={(e) =>
                        updateClinicalNote(
                          "historyOfPresentIllness",
                          e.target.value,
                        )
                      }
                      className="min-h-[150px]"
                      required
                    />
                    <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="h-3 w-3 mt-0.5" />
                      <span>
                        Use OPQRST format: Onset, Provocation/Palliation, Quality,
                        Region/Radiation, Severity, Timing
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Past Medical History - Free text for additional notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Past Medical History Notes
                    </CardTitle>
                    <CardDescription>
                      Additional notes about previous illnesses, medications, or
                      relevant history not captured in structured data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Additional medical history notes, current medications, previous hospitalizations..."
                      value={clinicalNote.pastMedicalHistory}
                      onChange={(e) =>
                        updateClinicalNote("pastMedicalHistory", e.target.value)
                      }
                      className="min-h-[100px]"
                    />
                  </CardContent>
                </Card>

                {/* Review of Systems */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-primary" />
                      Review of Systems (ROS)
                    </CardTitle>
                    <CardDescription>
                      Systematic review of body systems
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Constitutional, Eyes, ENT, Cardiovascular, Respiratory, GI, GU, MSK, Skin, Neurological, Psychiatric..."
                      value={clinicalNote.reviewOfSystems}
                      onChange={(e) =>
                        updateClinicalNote("reviewOfSystems", e.target.value)
                      }
                      className="min-h-[100px]"
                    />
                    <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-muted">
                      <p className="text-xs text-muted-foreground font-medium mb-2">
                        Quick ROS Checklist:
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs text-muted-foreground">
                        <span>• Constitutional</span>
                        <span>• Eyes/Vision</span>
                        <span>• ENT</span>
                        <span>• Cardiovascular</span>
                        <span>• Respiratory</span>
                        <span>• GI</span>
                        <span>• Genitourinary</span>
                        <span>• Musculoskeletal</span>
                        <span>• Skin</span>
                        <span>• Neurological</span>
                        <span>• Psychiatric</span>
                        <span>• Endocrine</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}{" "}
          {/* Vitals Tab - Hospital Grade */}
          <TabsContent value="vitals" className="mt-0 p-6 space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVitalsSubmit(e);
              }}
              className="h-full flex flex-col"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vital Signs Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" /> Vital Signs{" "}
                      <span className="text-destructive ml-1">*</span>
                    </CardTitle>
                    <CardDescription>
                      At minimum, record Blood Pressure, Heart Rate, and
                      Temperature
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Blood Pressure */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bp-sys">
                          Systolic BP (mmHg){" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="bp-sys"
                          type="number"
                          placeholder="120"
                          value={vitalsData.systolicBP}
                          onChange={(e) =>
                            updateVitals("systolicBP", e.target.value)
                          }
                          className={
                            parseInt(vitalsData.systolicBP) > 140 ||
                            parseInt(vitalsData.systolicBP) < 90
                              ? "border-red-300 bg-red-50"
                              : ""
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bp-dia">
                          Diastolic BP (mmHg){" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="bp-dia"
                          type="number"
                          placeholder="80"
                          value={vitalsData.diastolicBP}
                          onChange={(e) =>
                            updateVitals("diastolicBP", e.target.value)
                          }
                          className={
                            parseInt(vitalsData.diastolicBP) > 90 ||
                            parseInt(vitalsData.diastolicBP) < 60
                              ? "border-red-300 bg-red-50"
                              : ""
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Heart Rate & Resp Rate */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pulse">
                          Heart Rate (bpm){" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <HeartPulse className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="pulse"
                            type="number"
                            placeholder="72"
                            value={vitalsData.pulse}
                            onChange={(e) =>
                              updateVitals("pulse", e.target.value)
                            }
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="resp">Resp. Rate (bpm)</Label>
                        <div className="relative">
                          <Activity className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="resp"
                            type="number"
                            placeholder="16"
                            value={vitalsData.respiratoryRate}
                            onChange={(e) =>
                              updateVitals("respiratoryRate", e.target.value)
                            }
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Temp & O2 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="temp">Temperature (°C)</Label>
                        <div className="relative">
                          <FlaskConical className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="temp"
                            type="number"
                            step="0.1"
                            placeholder="37.0"
                            value={vitalsData.temperature}
                            onChange={(e) =>
                              updateVitals("temperature", e.target.value)
                            }
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="spo2">SpO2 (%)</Label>
                        <div className="relative">
                          <Activity className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="spo2"
                            type="number"
                            placeholder="98"
                            value={vitalsData.spo2}
                            onChange={(e) =>
                              updateVitals("spo2", e.target.value)
                            }
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Anthropometry & Other */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Anthropometry</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="height">Height (cm)</Label>
                          <Input
                            id="height"
                            type="number"
                            step="0.1"
                            placeholder="170"
                            value={vitalsData.height}
                            onChange={(e) =>
                              updateVitals("height", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="weight">Weight (kg)</Label>
                          <Input
                            id="weight"
                            type="number"
                            step="0.1"
                            placeholder="70"
                            value={vitalsData.weight}
                            onChange={(e) =>
                              updateVitals("weight", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      {vitalsData.height && vitalsData.weight && (
                        <div className="mt-4 p-3 bg-muted/20 rounded-lg flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            BMI Calculation:
                          </span>
                          <span className="font-bold text-lg">
                            {(
                              parseFloat(vitalsData.weight) /
                              Math.pow(parseFloat(vitalsData.height) / 100, 2)
                            ).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Other</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="pain">Pain Score (0-10)</Label>
                          <Input
                            id="pain"
                            type="number"
                            min="0"
                            max="10"
                            placeholder="0"
                            value={vitalsData.painScore}
                            onChange={(e) =>
                              updateVitals("painScore", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="glucose">Blood Glucose (mg/dL)</Label>
                          <Input
                            id="glucose"
                            type="number"
                            placeholder="100"
                            value={vitalsData.bloodGlucose}
                            onChange={(e) =>
                              updateVitals("bloodGlucose", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </form>
          </TabsContent>{" "}
          {/* Examination Tab */}
          {clinicType !== "DENTAL" && (
            <TabsContent value="examination" className="mt-0 p-6">
              <div className="space-y-6">
                <ClinicalExamination
                  generalExamination={clinicalNote.generalExamination as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                  systemicExamination={clinicalNote.systemicExamination as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                  onGeneralExaminationChange={(data) =>
                    updateClinicalNote("generalExamination", data)
                  }
                  onSystemicExaminationChange={(data) =>
                    updateClinicalNote("systemicExamination", data)
                  }
                />
              </div>
            </TabsContent>
          )}{" "}
          {/* Diagnosis Tab */}
          <TabsContent value="diagnosis" className="mt-0 p-6">
            <div className="space-y-6">
              {/* ICD-10 Coded Diagnoses - PRIMARY SECTION */}
              <Card className="border-primary/30">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Primary Diagnoses (ICD-10){" "}
                        <span className="text-destructive ml-1">*</span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add standardized diagnosis codes for accurate medical
                        records and billing. At least one diagnosis required.
                      </p>
                    </div>
                    <div className="w-full max-w-md">
                      <IcdCodeSearch onSelect={handleAddDiagnosis} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {diagnoses.length > 0 ? (
                    <DiagnosisList
                      diagnoses={diagnoses}
                      onRemove={handleRemoveDiagnosis}
                      onUpdateNotes={handleUpdateDiagnosisNote}
                      onTogglePrimary={handleTogglePrimaryDiagnosis}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <p className="text-sm text-muted-foreground">
                        No coded diagnoses added. Click above to search and add
                        ICD-10 codes.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Clinical Assessment</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Detailed clinical assessment and reasoning
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Describe clinical assessment, key findings, and diagnostic reasoning..."
                    value={clinicalNote.clinicalImpression}
                    onChange={(e) =>
                      updateClinicalNote("clinicalImpression", e.target.value)
                    }
                    className="min-h-[100px]"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Differential Diagnoses
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Alternative diagnoses considered
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="List other possible diagnoses considered and why they were ruled out..."
                    value={clinicalNote.differentialDiagnosis}
                    onChange={(e) =>
                      updateClinicalNote(
                        "differentialDiagnosis",
                        e.target.value,
                      )
                    }
                    className="min-h-20"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {/* Investigations & Treatment Plan Tab */}
          <TabsContent value="treatment" className="mt-0 p-6">
            <div className="space-y-6">
              {/* Clinical Investigations */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FlaskConical className="h-5 w-5 text-primary" />
                        Clinical Investigations
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Order laboratory tests, imaging studies, and special
                        procedures
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addInvestigation}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" /> Add Investigation
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {clinicalNote.investigations.map((inv, index) => (
                      <div
                        key={inv.id || index}
                        className="flex items-start gap-3 p-3 border rounded-lg bg-card group"
                      >
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                          <div className="md:col-span-4 space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Investigation
                            </Label>
                            <Input
                              placeholder="e.g., CBC, LFT, X-Ray Chest"
                              value={inv.name}
                              onChange={(e) =>
                                updateInvestigation(
                                  index,
                                  "name",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Category
                            </Label>
                            <Select
                              value={inv.category || "LABORATORY"}
                              onValueChange={(v) =>
                                updateInvestigation(index, "category", v)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="LABORATORY">
                                  Laboratory
                                </SelectItem>
                                <SelectItem value="IMAGING">Imaging</SelectItem>
                                <SelectItem value="SPECIAL">Special</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Status
                            </Label>
                            <Select
                              value={inv.status || "ORDERED"}
                              onValueChange={(v) =>
                                updateInvestigation(index, "status", v)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ORDERED">Ordered</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="COMPLETED">
                                  Completed
                                </SelectItem>
                                <SelectItem value="CANCELLED">
                                  Cancelled
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-3 space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Notes
                            </Label>
                            <Input
                              placeholder="Special instructions..."
                              value={inv.notes || ""}
                              onChange={(e) =>
                                updateInvestigation(
                                  index,
                                  "notes",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="md:col-span-1 flex items-end justify-end pb-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInvestigation(index)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {clinicalNote.investigations.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground">
                        No investigations ordered. Click &quot;Add
                        Investigation&quot; to order tests.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Procedures */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        Procedures (CPT)
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Add procedures performed during this visit with CPT
                        codes for billing
                      </p>
                    </div>
                    <div className="w-full max-w-md">
                      <CptCodeSearch
                        onSelect={handleAddProcedure}
                        selectedCodes={procedures.map((p) => p.cptCode.code)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ProcedureList
                    procedures={procedures}
                    onRemove={handleRemoveProcedure}
                    onAddToInvoice={handleAddToInvoice}
                  />
                </CardContent>
              </Card>

              {/* Final Diagnosis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Final Diagnosis</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Confirmed diagnosis after investigations
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Confirmed diagnosis based on clinical findings and investigations..."
                    value={clinicalNote.finalDiagnosis}
                    onChange={(e) =>
                      updateClinicalNote("finalDiagnosis", e.target.value)
                    }
                    className="min-h-20"
                  />
                </CardContent>
              </Card>

              {/* Treatment Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Treatment Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Treatment approach, recommendations, lifestyle modifications..."
                    value={clinicalNote.treatmentPlan}
                    onChange={(e) =>
                      updateClinicalNote("treatmentPlan", e.target.value)
                    }
                    className="min-h-[100px]"
                  />
                </CardContent>
              </Card>

              {/* Follow-up Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Follow-up Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Follow-up schedule, red flag symptoms to watch for, when to return..."
                    value={clinicalNote.followUpPlan}
                    onChange={(e) =>
                      updateClinicalNote("followUpPlan", e.target.value)
                    }
                    className="min-h-20"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>{" "}
          {/* Prescription Tab */}
          <TabsContent value="prescription" className="mt-0 p-6 space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRxSubmit(e);
              }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 space-y-6">
                {/* ICD-10 Diagnoses for Prescription - Medical Accuracy */}
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Activity className="h-5 w-5 text-primary" />
                          Diagnoses (ICD-10)
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Select diagnoses to link with this prescription
                        </p>
                      </div>
                      <div className="w-[300px]">
                        <IcdCodeSearch onSelect={handleAddDiagnosis} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {diagnoses.length > 0 ? (
                      <DiagnosisList
                        diagnoses={diagnoses}
                        onRemove={handleRemoveDiagnosis}
                        onUpdateNotes={handleUpdateDiagnosisNote}
                        onTogglePrimary={handleTogglePrimaryDiagnosis}
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Add diagnoses from the Diagnosis tab to ensure
                          accurate prescription coding
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Medications</Label>
                  <div className="flex gap-2">
                    <PrescriptionTemplateManager
                      onTemplateSelect={handleApplyPrescriptionTemplate}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMedication}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" /> Add Medication
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 pr-2">
                  {medications.map((med, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg bg-card space-y-4 relative group"
                    >
                      <div className="absolute right-3 top-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedication(index)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                        <div className="space-y-2">
                          <Label>Medicine Name</Label>
                          <MedicineAutocomplete
                            value={med.name}
                            onChange={(val) =>
                              updateMedication(index, "name", val)
                            }
                            placeholder="Search medicine..."
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-2">
                            <Label>Route</Label>
                            <Select
                              value={med.route || "PO"}
                              onValueChange={(val) =>
                                updateMedication(index, "route", val)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Route" />
                              </SelectTrigger>
                              <SelectContent>
                                {ROUTE_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Dosage</Label>
                            <Input
                              placeholder="500mg"
                              value={med.dosage}
                              onChange={(e) =>
                                updateMedication(
                                  index,
                                  "dosage",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Freq</Label>
                            <Input
                              placeholder="2x daily"
                              value={med.frequency}
                              onChange={(e) =>
                                updateMedication(
                                  index,
                                  "frequency",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Duration</Label>
                            <Input
                              placeholder="7 days"
                              value={med.duration}
                              onChange={(e) =>
                                updateMedication(
                                  index,
                                  "duration",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {medications.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                      No medications added. Click &quot;Add Medication&quot; to
                      start.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rx-instructions">Instructions</Label>
                  <Textarea
                    id="rx-instructions"
                    placeholder="Special instructions (e.g., take after food)..."
                    value={rxInstructions}
                    onChange={(e) => setRxInstructions(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveAsTemplate}
                  disabled={medications.length === 0}
                  className="gap-2"
                  style={{
                    display:
                      user?.role &&
                      ["ADMIN", "RECEPTIONIST"].includes(user.role)
                        ? "none"
                        : "inline-flex",
                  }}
                >
                  <Save className="h-4 w-4" /> Save as Template
                </Button>
                <Button
                  type="submit"
                  disabled={rxLoading}
                  className="gap-2"
                  style={{
                    display:
                      user?.role &&
                      ["ADMIN", "RECEPTIONIST"].includes(user.role)
                        ? "none"
                        : "inline-flex",
                  }}
                >
                  {rxLoading ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save Prescription
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
          {/* Invoice Tab */}
          <TabsContent value="invoice" className="mt-0 p-6 space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleInvSubmit(e);
              }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 space-y-6">
                <div className="bg-linear-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-lg font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        Invoice Items
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Add services, procedures, and consultation fees
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select value={invStatus} onValueChange={setInvStatus}>
                        <SelectTrigger className="w-[150px] bg-background">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {invoiceStatusOptions
                            .filter((opt) => opt.value !== "cancelled")
                            .map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => addItem()}
                        className="gap-2 shadow-sm"
                      >
                        <Plus className="h-4 w-4" /> Add Item
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {invoiceItems.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                      <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground font-medium mb-1">
                        {/* eslint-disable-next-line no-extra-boolean-cast */}
                        {Boolean(
                          (appointmentData as { invoice?: unknown } | undefined)
                            ?.invoice,
                        )
                          ? "Invoice already created"
                          : "No items added yet"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {/* eslint-disable-next-line no-extra-boolean-cast */}
                        {Boolean(
                          (appointmentData as { invoice?: unknown } | undefined)
                            ?.invoice,
                        )
                          ? "This appointment already has an invoice. You can view it in the Invoices section."
                          : 'Click "Add Item" to start building the invoice'}
                      </p>
                      {Boolean(
                        (appointmentData as { invoice?: unknown } | undefined)
                          ?.invoice,
                      ) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => {
                            window.location.href = `/invoices`;
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View in Invoices
                        </Button>
                      )}
                    </div>
                  )}
                  {invoiceItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 border rounded-lg bg-card hover:shadow-md transition-shadow group"
                    >
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-6 space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Description
                          </Label>
                          <Input
                            placeholder="Service description"
                            value={item.description}
                            onChange={(e) =>
                              updateInvoiceItem(
                                index,
                                "description",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Qty
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateInvoiceItem(
                                index,
                                "quantity",
                                parseInt(e.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Price (₹)
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) =>
                              updateInvoiceItem(
                                index,
                                "price",
                                parseFloat(e.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="md:col-span-1 flex items-end justify-end pb-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInvoiceItem(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-linear-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground font-medium">
                        Invoice Summary
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-muted-foreground">
                          Total Items:
                        </span>
                        <span className="font-semibold">
                          {invoiceItems.length}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">
                        Total Amount
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        ₹{calculateInvTotal().toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 mt-auto border-t">
                <p className="text-sm text-muted-foreground">
                  {invoiceItems.length}{" "}
                  {invoiceItems.length === 1 ? "item" : "items"} • Total: ₹
                  {calculateInvTotal().toFixed(2)}
                </p>
                <Button
                  type="submit"
                  disabled={invLoading || invoiceItems.length === 0}
                  className="gap-2 px-6"
                >
                  {invLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Generate Invoice
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
