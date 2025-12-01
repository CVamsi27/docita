"use client";

import { useState, useMemo, useEffect } from "react";
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
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  Activity,
  Pill,
  Receipt,
  FileText,
  Plus,
  X,
  Save,
  CheckCircle2,
  Stethoscope,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  PanelLeft,
  AlertTriangle,
  Heart,
  Users,
  Cigarette,
  Scissors,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  History,
} from "lucide-react";
import { SearchableSelect } from "@/components/common/searchable-select";
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
import type {
  PrescriptionTemplate,
  Medication,
  Diagnosis,
  IcdCode,
  Procedure,
  CptCode,
  Patient,
} from "@workspace/types";
import { ROUTE_OPTIONS } from "@workspace/types";
import { apiHooks } from "@/lib/api-hooks";
import { api } from "@/lib/api-client";
import { useFormOptions } from "@/lib/app-config-context";

// Define medical history types locally
type AllergySeverity = "MILD" | "MODERATE" | "SEVERE" | "LIFE_THREATENING";
type ConditionStatus = "ACTIVE" | "RESOLVED" | "CHRONIC" | "IN_REMISSION";
type ConditionType = "ACUTE" | "CHRONIC" | "CONGENITAL" | "ACQUIRED";

interface PatientMedicalCondition {
  id: string;
  patientId: string;
  conditionName: string;
  icdCode?: string;
  conditionType: ConditionType;
  status: ConditionStatus;
  diagnosedDate?: string;
  resolvedDate?: string;
  severity?: string;
  notes?: string;
  diagnosedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface PatientAllergy {
  id: string;
  patientId: string;
  allergen: string;
  allergyType: string;
  severity: AllergySeverity;
  reaction?: string;
  notes?: string;
  diagnosedDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PatientFamilyHistory {
  id: string;
  patientId: string;
  relationship: string;
  condition: string;
  ageAtOnset?: number;
  isAlive?: boolean;
  ageAtDeath?: number;
  causeOfDeath?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PatientSocialHistory {
  id: string;
  patientId: string;
  smokingStatus?: string;
  alcoholUse?: string;
  drugUse?: string;
  occupation?: string;
  exerciseFrequency?: string;
  diet?: string;
  maritalStatus?: string;
  livingArrangement?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PatientSurgicalHistory {
  id: string;
  patientId: string;
  procedureName: string;
  procedureDate?: string;
  hospital?: string;
  surgeon?: string;
  complications?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Extend Patient type with medical history
interface PatientWithHistory extends Patient {
  medicalConditions?: PatientMedicalCondition[];
  patientAllergies?: PatientAllergy[];
  familyHistory?: PatientFamilyHistory[];
  socialHistory?: PatientSocialHistory[];
  surgicalHistory?: PatientSurgicalHistory[];
}

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
}

type TabValue =
  | "chief-complaint"
  | "history"
  | "examination"
  | "diagnosis"
  | "treatment"
  | "vitals"
  | "prescription"
  | "invoice";

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
}: ClinicalDocumentationProps) {
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedHistorySections, setExpandedHistorySections] = useState<
    Record<string, boolean>
  >({
    conditions: true,
    allergies: true,
    surgeries: false,
    family: false,
    social: false,
  });

  // Get form options from config
  const invoiceStatusOptions = useFormOptions("invoiceStatus");

  // Fetch patient data with full medical history
  const { data: patientData } = apiHooks.usePatient(patientId) as {
    data: PatientWithHistory | undefined;
  };

  // Toggle history section
  const toggleHistorySection = (section: string) => {
    setExpandedHistorySections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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

  // Diagnosis State
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

  // Procedure State
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  // Template State
  const { data: templates = [], refetch: loadTemplates } =
    apiHooks.useTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>(
    {},
  );

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
    setDynamicFields({});
  };

  const updateClinicalNote = (
    field: keyof ClinicalNoteData,
    value: unknown,
  ) => {
    setClinicalNote((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Save clinical note to API
  const saveClinicalNote = async () => {
    setIsSaving(true);
    try {
      await api.patch(`/appointments/${appointmentId}`, {
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
      });
      toast.success("Clinical documentation saved");
      onSave?.();
    } catch (error) {
      console.error("Failed to save clinical note:", error);
      toast.error("Failed to save clinical documentation");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDiagnosis = (code: IcdCode) => {
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

    setDiagnoses([...diagnoses, newDiagnosis]);
    toast.success("Diagnosis added");
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
  } = useInvoiceForm({ appointmentId, patientId });

  const handleGlobalSave = () => {
    if (activeTab === "vitals") {
      // Trigger vitals submit
      const form = document.querySelector("form");
      if (form) form.requestSubmit();
    } else if (activeTab === "prescription") {
      // Trigger prescription submit
      const form = document.querySelector("form");
      if (form) form.requestSubmit();
    } else if (activeTab === "invoice") {
      // Trigger invoice submit
      const form = document.querySelector("form");
      if (form) form.requestSubmit();
    } else {
      // Save clinical note
      saveClinicalNote();
    }
  };

  return (
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
                {vitalsData.bloodPressure || "--/--"}
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

          {/* Sticky Save Button */}
          <Button
            onClick={handleGlobalSave}
            disabled={isSaving || vitalsLoading || rxLoading || invLoading}
            size="sm"
            className="gap-2 shadow-sm"
          >
            {isSaving || vitalsLoading || rxLoading || invLoading ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4" /> Save
              </>
            )}
          </Button>
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
            value="vitals"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 pb-0"
          >
            <div className="flex items-center gap-2 py-2">
              <HeartPulse className="h-4 w-4" />
              <span>Vitals</span>
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
          <TabsTrigger
            value="prescription"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 pb-0"
          >
            <div className="flex items-center gap-2 py-2">
              <Pill className="h-4 w-4" />
              <span>Prescription</span>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="invoice"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 pb-0"
          >
            <div className="flex items-center gap-2 py-2">
              <Receipt className="h-4 w-4" />
              <span>Invoice</span>
            </div>
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="p-6 flex-1 overflow-y-auto overflow-x-hidden min-h-[400px]">
        {/* Chief Complaint Tab */}
        <TabsContent value="chief-complaint" className="mt-0 h-full space-y-4">
          <div className="h-full flex flex-col">
            <div className="flex-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Chief Complaint
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    The primary reason for the patient&apos;s visit in their own
                    words
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="e.g., Fever and cough for 3 days, headache since yesterday..."
                    value={clinicalNote.chiefComplaint}
                    onChange={(e) =>
                      updateClinicalNote("chiefComplaint", e.target.value)
                    }
                    className="min-h-[150px]"
                  />
                </CardContent>
              </Card>

              {/* Clinical Template Selection */}
              <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg border border-border/50">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 block">
                    Clinical Template (Optional)
                  </Label>
                  <SearchableSelect
                    options={templateOptions}
                    value={selectedTemplateId}
                    onValueChange={handleTemplateChange}
                    placeholder="Select a speciality template..."
                    searchPlaceholder="Search templates..."
                    emptyMessage="No templates found."
                    className="bg-background"
                  />
                </div>
                {selectedTemplateId && selectedTemplateId !== "none" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-6">
                    <Badge className="bg-primary/10 text-primary">
                      {
                        templates.find((t) => t.id === selectedTemplateId)
                          ?.speciality
                      }
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-4 mt-auto">
              <Button
                onClick={saveClinicalNote}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save & Continue
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-0 h-full space-y-4">
          <div className="h-full flex flex-col">
            <div className="flex-1 space-y-6 overflow-y-auto">
              {/* Patient Medical History Summary Banner */}
              {patientData && (
                <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <History className="h-5 w-5 text-blue-500" />
                        Patient Medical History
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        From patient record
                      </Badge>
                    </div>
                    <CardDescription>
                      Pre-populated from {patientData.firstName}{" "}
                      {patientData.lastName}&apos;s medical record. Review and
                      update as needed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Known Allergies Alert */}
                    {patientData.patientAllergies &&
                      patientData.patientAllergies.length > 0 && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            Known Allergies (
                            {patientData.patientAllergies.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {patientData.patientAllergies.map((allergy) => (
                              <Badge
                                key={allergy.id}
                                variant={
                                  allergy.severity === "LIFE_THREATENING" ||
                                  allergy.severity === "SEVERE"
                                    ? "destructive"
                                    : allergy.severity === "MODERATE"
                                      ? "default"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {allergy.allergen}
                                {allergy.severity && (
                                  <span className="ml-1 opacity-75">
                                    (
                                    {allergy.severity
                                      .toLowerCase()
                                      .replace("_", " ")}
                                    )
                                  </span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Active Medical Conditions */}
                    <Collapsible
                      open={expandedHistorySections.conditions}
                      onOpenChange={() => toggleHistorySection("conditions")}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              Medical Conditions
                            </span>
                            {patientData.medicalConditions &&
                              patientData.medicalConditions.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {patientData.medicalConditions.length}
                                </Badge>
                              )}
                          </div>
                          {expandedHistorySections.conditions ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        {patientData.medicalConditions &&
                        patientData.medicalConditions.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                            {patientData.medicalConditions.map((condition) => (
                              <div
                                key={condition.id}
                                className="p-2 rounded border bg-card text-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">
                                    {condition.conditionName}
                                  </span>
                                  <Badge
                                    variant={
                                      condition.status === "ACTIVE"
                                        ? "destructive"
                                        : condition.status === "CHRONIC"
                                          ? "default"
                                          : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {condition.status}
                                  </Badge>
                                </div>
                                {condition.icdCode && (
                                  <span className="text-xs text-muted-foreground">
                                    ICD: {condition.icdCode}
                                  </span>
                                )}
                                {condition.diagnosedDate && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    Since:{" "}
                                    {new Date(
                                      condition.diagnosedDate,
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground pl-6">
                            No medical conditions recorded
                          </p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Surgical History */}
                    <Collapsible
                      open={expandedHistorySections.surgeries}
                      onOpenChange={() => toggleHistorySection("surgeries")}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-orange-500" />
                            <span className="font-medium">
                              Surgical History
                            </span>
                            {patientData.surgicalHistory &&
                              patientData.surgicalHistory.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {patientData.surgicalHistory.length}
                                </Badge>
                              )}
                          </div>
                          {expandedHistorySections.surgeries ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        {patientData.surgicalHistory &&
                        patientData.surgicalHistory.length > 0 ? (
                          <div className="space-y-2 pl-6">
                            {patientData.surgicalHistory.map((surgery) => (
                              <div
                                key={surgery.id}
                                className="p-2 rounded border bg-card text-sm"
                              >
                                <div className="font-medium">
                                  {surgery.procedureName}
                                </div>
                                <div className="text-xs text-muted-foreground flex gap-3">
                                  {surgery.procedureDate && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(
                                        surgery.procedureDate,
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                  {surgery.hospital && (
                                    <span>{surgery.hospital}</span>
                                  )}
                                </div>
                                {surgery.complications && (
                                  <div className="text-xs text-orange-600 mt-1">
                                    Complications: {surgery.complications}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground pl-6">
                            No surgical history recorded
                          </p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Family History */}
                    <Collapsible
                      open={expandedHistorySections.family}
                      onOpenChange={() => toggleHistorySection("family")}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            <span className="font-medium">Family History</span>
                            {patientData.familyHistory &&
                              patientData.familyHistory.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {patientData.familyHistory.length}
                                </Badge>
                              )}
                          </div>
                          {expandedHistorySections.family ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        {patientData.familyHistory &&
                        patientData.familyHistory.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                            {patientData.familyHistory.map((history) => (
                              <div
                                key={history.id}
                                className="p-2 rounded border bg-card text-sm"
                              >
                                <div className="font-medium">
                                  {history.condition}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {history.relationship}
                                  {history.ageAtOnset &&
                                    ` (onset at ${history.ageAtOnset} years)`}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground pl-6">
                            No family history recorded
                          </p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Social History */}
                    <Collapsible
                      open={expandedHistorySections.social}
                      onOpenChange={() => toggleHistorySection("social")}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Cigarette className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Social History</span>
                            {patientData.socialHistory &&
                              patientData.socialHistory.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  Recorded
                                </Badge>
                              )}
                          </div>
                          {expandedHistorySections.social ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        {patientData.socialHistory &&
                        patientData.socialHistory.length > 0 ? (
                          <div className="pl-6 space-y-2">
                            {patientData.socialHistory.map((social) => (
                              <div
                                key={social.id}
                                className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm"
                              >
                                {social.smokingStatus && (
                                  <div className="p-2 rounded border bg-card">
                                    <div className="text-xs text-muted-foreground">
                                      Smoking
                                    </div>
                                    <div className="font-medium">
                                      {social.smokingStatus}
                                    </div>
                                  </div>
                                )}
                                {social.alcoholUse && (
                                  <div className="p-2 rounded border bg-card">
                                    <div className="text-xs text-muted-foreground">
                                      Alcohol
                                    </div>
                                    <div className="font-medium">
                                      {social.alcoholUse}
                                    </div>
                                  </div>
                                )}
                                {social.occupation && (
                                  <div className="p-2 rounded border bg-card">
                                    <div className="text-xs text-muted-foreground">
                                      Occupation
                                    </div>
                                    <div className="font-medium">
                                      {social.occupation}
                                    </div>
                                  </div>
                                )}
                                {social.exerciseFrequency && (
                                  <div className="p-2 rounded border bg-card">
                                    <div className="text-xs text-muted-foreground">
                                      Exercise
                                    </div>
                                    <div className="font-medium">
                                      {social.exerciseFrequency}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground pl-6">
                            No social history recorded
                          </p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              )}

              {/* History of Present Illness */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    History of Present Illness (HPI)
                  </CardTitle>
                  <CardDescription>
                    Detailed chronological description of the chief complaint
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Duration, onset, location, character, aggravating/relieving factors, associated symptoms..."
                    value={clinicalNote.historyOfPresentIllness}
                    onChange={(e) =>
                      updateClinicalNote(
                        "historyOfPresentIllness",
                        e.target.value,
                      )
                    }
                    className="min-h-[120px]"
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
            <div className="flex justify-end pt-4 mt-auto">
              <Button
                onClick={saveClinicalNote}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save & Continue
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Vitals Tab */}
        <TabsContent value="vitals" className="mt-0 h-full space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVitalsSubmit(e);
            }}
            className="h-full flex flex-col"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> Physical Stats
                  </CardTitle>
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
                        onChange={(e) => updateVitals("height", e.target.value)}
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
                        onChange={(e) => updateVitals("weight", e.target.value)}
                      />
                    </div>
                  </div>
                  {vitalsData.height && vitalsData.weight && (
                    <div className="mt-4 p-3 bg-muted/20 rounded-lg">
                      <span className="text-sm text-muted-foreground">
                        BMI:{" "}
                      </span>
                      <span className="font-medium">
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
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 text-red-500" /> Vital Signs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bp">Blood Pressure</Label>
                      <Input
                        id="bp"
                        placeholder="120/80"
                        value={vitalsData.bloodPressure}
                        onChange={(e) =>
                          updateVitals("bloodPressure", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pulse">Pulse (bpm)</Label>
                      <Input
                        id="pulse"
                        type="number"
                        placeholder="72"
                        value={vitalsData.pulse}
                        onChange={(e) => updateVitals("pulse", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rr">Respiratory Rate (/min)</Label>
                      <Input
                        id="rr"
                        type="number"
                        placeholder="16"
                        value={vitalsData.respiratoryRate || ""}
                        onChange={(e) =>
                          updateVitals("respiratoryRate", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="temp">Temperature (°F)</Label>
                      <Input
                        id="temp"
                        type="number"
                        step="0.1"
                        placeholder="98.6"
                        value={vitalsData.temperature}
                        onChange={(e) =>
                          updateVitals("temperature", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="spo2">SpO2 (%)</Label>
                      <Input
                        id="spo2"
                        type="number"
                        placeholder="98"
                        value={vitalsData.spo2}
                        onChange={(e) => updateVitals("spo2", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pain">Pain Score (0-10)</Label>
                      <Input
                        id="pain"
                        type="number"
                        min="0"
                        max="10"
                        placeholder="0"
                        value={vitalsData.painScore || ""}
                        onChange={(e) =>
                          updateVitals("painScore", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-end pt-6 mt-auto">
              <Button type="submit" disabled={vitalsLoading} className="gap-2">
                {vitalsLoading ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Vitals
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Examination Tab */}
        <TabsContent value="examination" className="mt-0 h-full space-y-4">
          <div className="h-full flex flex-col">
            <div className="flex-1">
              <ClinicalExamination
                generalExamination={clinicalNote.generalExamination}
                systemicExamination={clinicalNote.systemicExamination}
                onGeneralExaminationChange={(data) =>
                  updateClinicalNote("generalExamination", data)
                }
                onSystemicExaminationChange={(data) =>
                  updateClinicalNote("systemicExamination", data)
                }
              />
            </div>
            <div className="flex justify-end pt-4 mt-auto">
              <Button
                onClick={saveClinicalNote}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Examination
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Diagnosis Tab */}
        <TabsContent value="diagnosis" className="mt-0 h-full space-y-4">
          <div className="h-full flex flex-col">
            <div className="flex-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Provisional Diagnosis
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Initial diagnosis based on history and examination
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Initial diagnosis before investigations..."
                    value={clinicalNote.provisionalDiagnosis}
                    onChange={(e) =>
                      updateClinicalNote("provisionalDiagnosis", e.target.value)
                    }
                    className="min-h-[80px]"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Differential Diagnosis
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Other possible diagnoses to consider
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="List other possible diagnoses..."
                    value={clinicalNote.differentialDiagnosis}
                    onChange={(e) =>
                      updateClinicalNote(
                        "differentialDiagnosis",
                        e.target.value,
                      )
                    }
                    className="min-h-[80px]"
                  />
                </CardContent>
              </Card>

              {/* ICD-10 Coded Diagnoses */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        ICD-10 Coded Diagnoses
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Add standardized ICD-10 diagnosis codes
                      </p>
                    </div>
                    <div className="w-[300px]">
                      <IcdCodeSearch onSelect={handleAddDiagnosis} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DiagnosisList
                    diagnoses={diagnoses}
                    onRemove={handleRemoveDiagnosis}
                    onUpdateNotes={handleUpdateDiagnosisNote}
                    onTogglePrimary={handleTogglePrimaryDiagnosis}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Clinical Impression</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Overall clinical impression and summary..."
                    value={clinicalNote.clinicalImpression}
                    onChange={(e) =>
                      updateClinicalNote("clinicalImpression", e.target.value)
                    }
                    className="min-h-[80px]"
                  />
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-end pt-4 mt-auto">
              <Button
                onClick={saveClinicalNote}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Diagnosis
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Investigations & Treatment Plan Tab */}
        <TabsContent value="treatment" className="mt-0 h-full space-y-4">
          <div className="h-full flex flex-col">
            <div className="flex-1 space-y-6">
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
                        Order laboratory tests and imaging studies
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Procedures (CPT)
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Add procedures performed during this visit
                      </p>
                    </div>
                    <div className="w-[300px]">
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
                    className="min-h-[80px]"
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
                    className="min-h-[80px]"
                  />
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-end pt-4 mt-auto">
              <Button
                onClick={saveClinicalNote}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Treatment Plan
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Prescription Tab */}
        <TabsContent value="prescription" className="mt-0 h-full space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRxSubmit(e);
            }}
            className="h-full flex flex-col"
          >
            <div className="flex-1 space-y-6">
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

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {medications.map((med, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg bg-card space-y-4 relative group"
                  >
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedication(index)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              updateMedication(index, "dosage", e.target.value)
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
              >
                <Save className="h-4 w-4" /> Save as Template
              </Button>
              <Button type="submit" disabled={rxLoading} className="gap-2">
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
        <TabsContent value="invoice" className="mt-0 h-full space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleInvSubmit(e);
            }}
            className="h-full flex flex-col"
          >
            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Invoice Items</Label>
                  <p className="text-sm text-muted-foreground">
                    Add services and costs
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={invStatus} onValueChange={setInvStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoiceStatusOptions
                        .filter((opt) => opt.value !== "cancelled")
                        .map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addItem()}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" /> Add Item
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {invoiceItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 border rounded-lg bg-card group"
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

              <div className="flex items-center justify-end gap-4 p-4 bg-muted/10 rounded-lg">
                <span className="text-lg font-medium">Total Amount:</span>
                <span className="text-2xl font-bold text-primary">
                  ₹{calculateInvTotal().toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex justify-end pt-4 mt-auto">
              <Button type="submit" disabled={invLoading} className="gap-2">
                {invLoading ? (
                  "Creating..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Create Invoice
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>
      </div>
    </Tabs>
  );
}
