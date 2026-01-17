"use client";

import React, { FC, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Activity,
  Baby,
  Clock,
  Eye,
  FileText,
  Pill,
  Smile,
  Stethoscope,
} from "lucide-react";
import { ConsultationFormRenderer } from "./ConsultationFormRenderer";
import { ChiefComplaintItem } from "./structured/ChiefComplaintInput";
import { DiagnosisItem } from "./structured/DiagnosisInput";
import { ExaminationData } from "./structured/ExaminationInput";
import { Medication } from "./structured/PrescriptionInput";
import { DentalChartValue } from "./specialty/DentalChartUI";
import { usePatient } from "@/hooks/api/use-patients";
import { useCreatePrescription } from "@/hooks/api/use-clinical";
import { toast } from "sonner";
import { Appointment } from "@workspace/types";

interface ClinicalDocumentationDynamicProps {
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
  // Make appointmentData optional but strongly recommended for functionality
  appointmentData?: ConsultationAppointmentData;
  defaultTab?: string;
  onSave?: (data: ConsultationSaveData) => Promise<void>;
  isFocusMode?: boolean;
  onToggleFocus?: () => void;
  clinicType?: string;
}

// Extended interface for appointment data that might include legacy or specialty fields
interface ConsultationAppointmentData extends Partial<Appointment> {
  chiefComplaintStructured?: ChiefComplaintItem[];
  growthData?: Record<string, unknown>;
  dentalChart?: DentalChartValue;
  ophthalmologyExam?: Record<string, unknown>;
  // Allow for other potential dynamic fields while simpler than 'any'
  [key: string]: unknown;
}

interface ConsultationSaveData {
  chiefComplaint: string;
  chiefComplaintStructured: ChiefComplaintItem[];
  historyOfPresentIllness: unknown;
  generalExamination: ExaminationData;
  finalDiagnosis: string;
  treatmentPlan: string;
  dentalChart?: DentalChartValue;
  ophthalmologyExam?: Record<string, unknown>;
  growthData?: Record<string, unknown>;
}

export const ClinicalDocumentationDynamic: FC<
  ClinicalDocumentationDynamicProps
> = ({
  appointmentId,
  patientId,
  appointmentData,
  defaultTab = "chief-complaint",
  onSave,
  isFocusMode,
  onToggleFocus,
  clinicType = "GENERAL",
}) => {
  const [activeTab, setActiveTab] = React.useState(defaultTab);
  const [viewMode, setViewMode] = React.useState<"tabs" | "scroll">("tabs");
  const [isSaving, setIsSaving] = React.useState(false);

  // General Fields (Structured)
  const [chiefComplaint, setChiefComplaint] = React.useState<
    ChiefComplaintItem[]
  >([]);
  const [history, setHistory] = React.useState<unknown>(null); // Managed via PatientMedicalHistoryContainer
  const [examination, setExamination] = React.useState<ExaminationData>({
    general: {
      pallor: false,
      icterus: false,
      cyanosis: false,
      clubbing: false,
      lymphadenopathy: false,
      edema: false,
      notes: "",
    },
    systemic: {
      cvs: "",
      rs: "",
      pa: "",
      cns: "",
      musculoskeletal: "",
      notes: "",
    },
  });
  const [diagnosis, setDiagnosis] = React.useState<DiagnosisItem[]>([]);
  const [treatment, setTreatment] = React.useState("");
  const [prescriptions, setPrescriptions] = React.useState<Medication[]>([]);

  // Specialty Fields
  const [dentalChart, setDentalChart] = React.useState<DentalChartValue>({});
  const [eyeExam, setEyeExam] = React.useState<Record<string, unknown>>({});
  const [growthData, setGrowthData] = React.useState<Record<string, unknown>>(
    {}
  );

  // Fetch Patient Data for History
  const { data: patient } = usePatient(patientId || "");
  const createPrescription = useCreatePrescription();

  // Initialize data
  useEffect(() => {
    if (appointmentData) {
      if (appointmentData.chiefComplaintStructured) {
        setChiefComplaint(appointmentData.chiefComplaintStructured);
      } else if (appointmentData.chiefComplaint) {
        // Convert legacy string to single item
        setChiefComplaint([
          {
            id: "legacy",
            complaint: appointmentData.chiefComplaint,
            durationValue: "",
            durationUnit: "days",
            severity: "moderate",
          },
        ]);
      }

      setHistory(appointmentData.historyOfPresentIllness || "");

      // Handle Examination Data safely for both legacy wrapper and new schema
      if (
        appointmentData.generalExamination ||
        appointmentData.systemicExamination
      ) {
        const genExam = appointmentData.generalExamination;
        const sysExam = appointmentData.systemicExamination;

        // Helper check for legacy wrapper where generalExamination contained both parts
        const isLegacyWrapper = (data: unknown): data is ExaminationData => {
          return (
            typeof data === "object" &&
            data !== null &&
            ("general" in data || "systemic" in data)
          );
        };

        const ensureString = (val: unknown): string => {
          if (typeof val === "string") return val;
          if (typeof val === "object" && val !== null)
            return JSON.stringify(val);
          return "";
        };

        if (genExam && isLegacyWrapper(genExam)) {
          setExamination(genExam);
        } else {
          // Standard schema structure: map separate fields
          setExamination((prev) => ({
            general: genExam ? { ...prev.general, ...genExam } : prev.general,
            systemic: sysExam
              ? {
                  cvs: ensureString(sysExam.cvs) || prev.systemic.cvs,
                  rs: ensureString(sysExam.rs) || prev.systemic.rs,
                  pa: ensureString(sysExam.pa) || prev.systemic.pa,
                  cns: ensureString(sysExam.cns) || prev.systemic.cns,
                  // musculoskeletal not present in shared SystemicExamination schema
                  musculoskeletal: prev.systemic.musculoskeletal,
                  notes: sysExam.additionalNotes || prev.systemic.notes,
                }
              : prev.systemic,
          }));
        }
      }

      if (appointmentData.finalDiagnosis) {
        // Determine if it looks like JSON or just string
        try {
          const parsed = JSON.parse(appointmentData.finalDiagnosis);
          if (Array.isArray(parsed)) {
            setDiagnosis(parsed);
          } else {
            setDiagnosis([
              {
                id: "legacy-dx",
                condition: appointmentData.finalDiagnosis,
                type: "provisional",
                status: "active",
              },
            ]);
          }
        } catch (_e) {
          setDiagnosis([
            {
              id: "legacy-dx",
              condition: appointmentData.finalDiagnosis,
              type: "provisional",
              status: "active",
            },
          ]);
        }
      } else if (appointmentData.provisionalDiagnosis) {
        // Fallback
        setDiagnosis([
          {
            id: "legacy-prov",
            condition: appointmentData.provisionalDiagnosis,
            type: "provisional",
            status: "active",
          },
        ]);
      }

      setTreatment(appointmentData.treatmentPlan || "");

      // Initialize Specialty Data
      if (appointmentData.dentalChart)
        setDentalChart(appointmentData.dentalChart);
      if (appointmentData.ophthalmologyExam)
        setEyeExam(appointmentData.ophthalmologyExam);
      if (appointmentData.growthData) setGrowthData(appointmentData.growthData);
    }
  }, [appointmentData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Serialize structured inputs
      const chiefComplaintString = chiefComplaint
        .map((c) => `${c.complaint} (${c.durationValue} ${c.durationUnit})`)
        .join("; ");

      const diagnosisString = JSON.stringify(diagnosis); // Save as JSON string for now to preserve structure

      const dataToSave = {
        chiefComplaint: chiefComplaintString,
        // Also save structured version if backend supports it (or extended properties)
        chiefComplaintStructured: chiefComplaint,

        historyOfPresentIllness: history, // Note: Medical history is saved via PatientMedicalHistoryContainer independently usually

        generalExamination: examination, // Save the full object

        finalDiagnosis: diagnosisString,
        treatmentPlan: treatment,

        // Specialty Data
        dentalChart: clinicType === "DENTAL" ? dentalChart : undefined,
        ophthalmologyExam: clinicType === "OPHTHALMOLOGY" ? eyeExam : undefined,
        growthData:
          clinicType === "PEDIATRIC" || clinicType === "GENERAL"
            ? growthData
            : undefined,
      };

      await onSave?.(dataToSave);
      toast.success("Consultation saved");

      // Handle Prescriptions
      if (prescriptions.length > 0 && patientId && appointmentId) {
        // Filter empty
        const validRx = prescriptions.filter((p) => p.name.trim() !== "");
        if (validRx.length > 0) {
          await createPrescription.mutateAsync({
            patientId,
            appointmentId,
            medications: validRx.map((p) => ({
              ...p,
              dosageForm: "TABLET", // Default to TABLET if not specified
              sigCode: "QD", // Default to QD if not specified
            })),
            notes: "Created from consultation",
          });
          toast.success("Prescription saved");
        }
      }
    } catch (error) {
      console.error("Failed to save consultation", error);
      toast.error("Failed to save consultation");
    } finally {
      setIsSaving(false);
    }
  };

  // Determined tabs based on Clinic Type
  const getTabs = () => {
    const baseTabs = [
      { id: "chief-complaint", label: "Chief Complaint", icon: FileText },
      { id: "history", label: "History", icon: Clock },
    ];

    // Specialty or General Examination
    if (clinicType === "DENTAL") {
      baseTabs.push({ id: "dental-chart", label: "Dental Chart", icon: Smile });
    } else if (clinicType === "OPHTHALMOLOGY") {
      baseTabs.push({ id: "vision-exam", label: "Vision Exam", icon: Eye });
    } else if (clinicType === "PEDIATRIC") {
      baseTabs.push({
        id: "growth-chart",
        label: "Growth & Vitals",
        icon: Baby,
      });
      baseTabs.push({
        id: "examination",
        label: "Examination",
        icon: Stethoscope,
      });
    } else {
      baseTabs.push({
        id: "examination",
        label: "Examination",
        icon: Stethoscope,
      });
    }

    baseTabs.push(
      { id: "diagnosis", label: "Diagnosis", icon: Activity },
      { id: "treatment", label: "Treatment", icon: Pill }
    );

    return baseTabs;
  };

  const tabs = getTabs();

  // Create objects for renderer
  const formData = {
    chiefComplaint,
    history,
    examination,
    diagnosis,
    treatment,
    prescriptions,
    dentalChart,
    eyeExam,
    growthData,
  };

  const formHandlers = {
    setChiefComplaint: (val: ChiefComplaintItem[]) => setChiefComplaint(val),
    setHistory: (val: unknown) => setHistory(val),
    setExamination: (val: ExaminationData) => setExamination(val),
    setDiagnosis: (val: DiagnosisItem[]) => setDiagnosis(val),
    setTreatment: (val: string) => setTreatment(val),
    setPrescriptions: (val: Medication[]) => setPrescriptions(val),
    setDentalChart: (val: DentalChartValue) => setDentalChart(val),
    setEyeExam: (val: unknown) => setEyeExam(val as Record<string, unknown>),
    setGrowthData: (val: unknown) =>
      setGrowthData(val as Record<string, unknown>),
  };

  return (
    <div className="flex flex-col h-full bg-muted/10">
      {/* Tab/View Navigation */}
      <div className="flex items-center gap-2 p-3 border-b bg-background/95 backdrop-blur sticky top-0 z-20">
        <div className="flex bg-muted/50 p-1 rounded-lg overflow-x-auto max-w-[calc(100vw-300px)]">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={
                activeTab === tab.id && viewMode === "tabs"
                  ? "default"
                  : "ghost"
              }
              size="sm"
              onClick={() => {
                setActiveTab(tab.id);
                if (viewMode === "scroll") {
                  document
                    .getElementById(`section-${tab.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className={`gap-1.5 h-8 whitespace-nowrap ${viewMode === "scroll" ? "opacity-70 hover:opacity-100" : ""}`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline text-xs">{tab.label}</span>
            </Button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 border-l pl-2 ml-2">
          <Button
            variant={viewMode === "scroll" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode(viewMode === "tabs" ? "scroll" : "tabs")}
            className="gap-2 h-8"
            title="Toggle Unified Scroll View"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">
              {viewMode === "tabs" ? "Unified View" : "Tabbed View"}
            </span>
          </Button>

          {onToggleFocus && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFocus}
              className="h-8"
            >
              {isFocusMode ? "Show Sidebar" : "Focus Mode"}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 bg-primary hover:bg-primary/90"
          >
            {isSaving ? "Saving..." : "Save Notes"}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-muted/10">
        {viewMode === "tabs" ? (
          <div className="p-4 md:p-6 max-w-5xl mx-auto h-full">
            <Card className="border-none shadow-sm h-full flex flex-col">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  {(() => {
                    const t = tabs.find((t) => t.id === activeTab) || tabs[0];
                    const Icon = t?.icon;
                    return (
                      <>
                        {Icon && <Icon className="h-5 w-5 text-primary" />}
                        {t?.label}
                      </>
                    );
                  })()}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
                <div className="flex-1 h-full overflow-y-auto">
                  <ConsultationFormRenderer
                    tabId={activeTab}
                    data={formData}
                    handlers={formHandlers}
                    patient={patient}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-20">
            {tabs.map((tab) => (
              <Card
                key={tab.id}
                id={`section-${tab.id}`}
                className="npm border-none shadow-sm scroll-mt-20"
              >
                <CardHeader className="py-3 px-4 border-b bg-muted/5">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <tab.icon className="h-4 w-4 text-primary" />
                    {tab.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ConsultationFormRenderer
                    tabId={tab.id}
                    data={formData}
                    handlers={formHandlers}
                    patient={patient}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
