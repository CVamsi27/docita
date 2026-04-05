"use client";

import React, { FC, useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Activity,
  Baby,
  Eye,
  FileText,
  MessageSquare,
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
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import { fetchAPI } from "@/lib/api-core";
import { ApiError } from "@/lib/errors";
import {
  GrowthChartData,
  OphthalmologyExamData,
  Patient,
} from "@workspace/types";
import {
  ConsultationProgressUI,
  ConsultationStep,
} from "./ConsultationProgressUI";
import {
  normalizeConsultationTab,
  getConsultationTabIds,
} from "@/features/consultation/rules/consultationTabRouting";

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(Object.entries(value));
}

function getPrescriptionComplianceErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) {
    return null;
  }

  if (error.code === "DOCTOR_SIGNATURE_REQUIRED") {
    return "Doctor signature is required before creating a prescription.";
  }

  if (error.code === "DOCTOR_VERIFICATION_REQUIRED") {
    return "Doctor government verification is required before creating a prescription.";
  }

  return null;
}

function isExaminationComplete(exam: ExaminationData): boolean {
  const gen = exam.general;
  if (
    gen.pallor ||
    gen.icterus ||
    gen.cyanosis ||
    gen.clubbing ||
    gen.lymphadenopathy ||
    gen.edema
  )
    return true;
  if (gen.notes?.trim()) return true;
  const sys = exam.systemic;
  if (
    sys.cvs?.trim() ||
    sys.rs?.trim() ||
    sys.pa?.trim() ||
    sys.cns?.trim() ||
    sys.musculoskeletal?.trim() ||
    sys.notes?.trim()
  )
    return true;
  return false;
}

interface ClinicalDocumentationDynamicProps {
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
  appointmentData?: ConsultationAppointmentData;
  defaultTab?: string;
  onSave?: (data: ConsultationSaveData) => Promise<void>;
  isFocusMode?: boolean;
  onToggleFocus?: () => void;
  clinicType?: string;
}

interface ConsultationAppointmentData {
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
  patient?: Patient;
  chiefComplaint?: string;
  historyOfPresentIllness?: string | null;
  chiefComplaintStructured?: ChiefComplaintItem[];
  growthData?: GrowthChartData;
  dentalChart?: DentalChartValue;
  ophthalmologyExam?: OphthalmologyExamData;
  generalExamination?: Record<string, unknown> | null;
  systemicExamination?: Record<string, unknown> | null;
  treatmentPlan?: string;
  finalDiagnosis?: string;
  [key: string]: unknown;
}

interface ConsultationSaveData {
  chiefComplaint: string;
  chiefComplaintStructured: ChiefComplaintItem[];
  historyOfPresentIllness: string | null;
  generalExamination: ExaminationData;
  finalDiagnosis: string;
  treatmentPlan: string;
  dentalChart?: DentalChartValue;
  ophthalmologyExam?: OphthalmologyExamData;
  growthData?: GrowthChartData;
  status?: "scheduled" | "confirmed" | "checked-in" | "in-progress" | "completed" | "cancelled" | "no-show";

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
  onToggleFocus: _onToggleFocus,
  clinicType = "GENERAL",
}) => {
  const [activeTab, setActiveTab] = useState<string>(() =>
    normalizeConsultationTab(defaultTab, clinicType),
  );
  const [isSaving, setIsSaving] = useState(false);

  const [chiefComplaint, setChiefComplaint] = useState<ChiefComplaintItem[]>([
    {
      id: crypto.randomUUID(),
      complaint: "",
      durationValue: "",
      durationUnit: "days",
      severity: "moderate",
      notes: "",
    },
  ]);
  const [history, setHistory] = useState<string | null>(null);
  const [examination, setExamination] = useState<ExaminationData>({
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
  const [diagnosis, setDiagnosis] = useState<DiagnosisItem[]>([]);
  const [treatment, setTreatment] = useState("");
  const [prescriptions, setPrescriptions] = useState<Medication[]>([]);
  const [sendToWhatsapp, setSendToWhatsapp] = useState(true);

  const [dentalChart, setDentalChart] = useState<DentalChartValue>({});
  const [eyeExam, setEyeExam] = useState<OphthalmologyExamData>({});
  const [growthData, setGrowthData] = useState<GrowthChartData>({
    patientGender: "MALE",
    measurements: [],
  });

  const { data: fetchedPatient, isLoading: isPatientLoading } = usePatient(
    patientId || "",
  );

  const patient = fetchedPatient || (appointmentData?.patient as Patient);
  const createPrescription = useCreatePrescription();

  useEffect(() => {
    if (appointmentData) {
      if (appointmentData.chiefComplaintStructured?.length) {
        setChiefComplaint(appointmentData.chiefComplaintStructured);
      } else if (appointmentData.chiefComplaint) {
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

      setHistory((appointmentData.historyOfPresentIllness as string) || "");

      if (
        appointmentData.generalExamination ||
        appointmentData.systemicExamination
      ) {
        const genExam = appointmentData.generalExamination;
        const sysExam = appointmentData.systemicExamination;

        const ensureString = (val: unknown): string => {
          if (typeof val === "string") return val;
          if (typeof val === "object" && val !== null) {
            const obj = toRecord(val);
            if ("notes" in obj && typeof obj.notes === "string")
              return obj.notes;
            return JSON.stringify(val);
          }
          if (val === null || val === undefined) return "";
          return String(val);
        };

        setExamination((prev) => ({
          general: genExam ? { ...prev.general, ...genExam } : prev.general,
          systemic: sysExam
            ? {
                cvs: ensureString(sysExam.cvs) || prev.systemic.cvs,
                rs: ensureString(sysExam.rs) || prev.systemic.rs,
                pa: ensureString(sysExam.pa) || prev.systemic.pa,
                cns: ensureString(sysExam.cns) || prev.systemic.cns,
                musculoskeletal: prev.systemic.musculoskeletal,
                notes: ensureString(sysExam.additionalNotes) || prev.systemic.notes,
              }
            : prev.systemic,
        }));
      }

      const rawDiagnosis = toRecord(appointmentData).finalDiagnosis;
      if (typeof rawDiagnosis === "string") {
        try {
          const parsed = JSON.parse(rawDiagnosis);
          if (Array.isArray(parsed)) {
            setDiagnosis(parsed as DiagnosisItem[]);
          } else {
            setDiagnosis([
              {
                id: "legacy-dx",
                condition: rawDiagnosis,
                type: "provisional",
                status: "active",
              },
            ]);
          }
        } catch {
          setDiagnosis([
            {
              id: "legacy-dx",
              condition: rawDiagnosis,
              type: "provisional",
              status: "active",
            },
          ]);
        }
      }

      if (appointmentData.treatmentPlan) {
        setTreatment(appointmentData.treatmentPlan);
      }

      if (appointmentData.dentalChart) {
        setDentalChart(appointmentData.dentalChart);
      }
      if (appointmentData.ophthalmologyExam) {
        setEyeExam(appointmentData.ophthalmologyExam);
      }
      if (appointmentData.growthData) {
        setGrowthData(appointmentData.growthData);
      }
    }
  }, [appointmentData]);

  const handleSaveData = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      const isComplete = progress.isMinimumMet;
      const saveData: ConsultationSaveData = {
        chiefComplaint: chiefComplaint.map((c) => c.complaint).join(", "),
        chiefComplaintStructured: chiefComplaint,
        historyOfPresentIllness: history,
        generalExamination: examination,
        finalDiagnosis: JSON.stringify(diagnosis),
        treatmentPlan: treatment,
        dentalChart: clinicType === "DENTAL" ? dentalChart : undefined,
        ophthalmologyExam: clinicType === "OPHTHALMOLOGY" ? eyeExam : undefined,
        growthData: clinicType === "PEDIATRIC" ? growthData : undefined,
        ...(isComplete ? { status: "completed" as const } : {}),
      };

      await onSave(saveData);

      if (prescriptions.length > 0) {
        await createPrescription.mutateAsync({
          patientId: patientId || "",
          appointmentId,
          medications: prescriptions.map((p) => ({
            name: p.name,
            dosage: p.dosage,
            frequency: p.frequency,
            duration: p.duration,
            route: p.route || "PO",
            prnInstructions: "",
            instructions: p.instructions || undefined,
          })),
        });
      }

      if (sendToWhatsapp && appointmentId) {
        await fetchAPI(`/appointments/${appointmentId}/whatsapp-summary`, {
          method: "POST",
        });
      }

      toast.success("Consultation saved successfully");
    } catch (error: unknown) {
      const complianceMessage = getPrescriptionComplianceErrorMessage(error);
      toast.error(complianceMessage || "Failed to save consultation");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = useMemo(
    () => [
      {
        id: "chief-complaint",
        label: "Chief Complaint",
        shortLabel: "Complaint",
        icon: <Activity className="h-4 w-4" />,
      },
      {
        id: "history",
        label: "History",
        shortLabel: "History",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        id: "examination",
        label: "Examination",
        shortLabel: "Exam",
        icon: <Stethoscope className="h-4 w-4" />,
      },
      ...(clinicType === "DENTAL"
        ? [
            {
              id: "dental-chart",
              label: "Dental Chart",
              shortLabel: "Dental",
              icon: <Smile className="h-4 w-4" />,
            },
          ]
        : []),
      ...(clinicType === "OPHTHALMOLOGY"
        ? [
            {
              id: "vision-exam",
              label: "Vision Exam",
              shortLabel: "Vision",
              icon: <Eye className="h-4 w-4" />,
            },
          ]
        : []),
      ...(clinicType === "PEDIATRIC"
        ? [
            {
              id: "growth-chart",
              label: "Growth Chart",
              shortLabel: "Growth",
              icon: <Baby className="h-4 w-4" />,
            },
          ]
        : []),
      {
        id: "diagnosis",
        label: "Diagnosis",
        shortLabel: "Diagnosis",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        id: "treatment",
        label: "Treatment",
        shortLabel: "Treatment",
        icon: <Pill className="h-4 w-4" />,
      },
    ],
    [clinicType],
  );

  const availableTabIds = useMemo(
    () => getConsultationTabIds(clinicType),
    [clinicType],
  );

  useEffect(() => {
    const normalized = normalizeConsultationTab(defaultTab, clinicType);
    setActiveTab((current) => (current === normalized ? current : normalized));
  }, [defaultTab, clinicType]);

  useEffect(() => {
    if (!availableTabIds.includes(activeTab)) {
      setActiveTab("chief-complaint");
    }
  }, [activeTab, availableTabIds]);

  const steps: ConsultationStep[] = useMemo(() => [
    {
      id: "chief-complaint",
      label: "Chief Complaint",
      shortLabel: "Complaint",
      isRequired: true,
      isComplete:
        chiefComplaint.length > 0 &&
        chiefComplaint.some((c) => c.complaint.trim().length > 0),
    },
    {
      id: "history",
      label: "History",
      shortLabel: "History",
      isRequired: false,
      isComplete: !!history && history.trim().length > 0,
    },
    {
      id: "examination",
      label: "Examination",
      shortLabel: "Exam",
      isRequired: false,
      isComplete: isExaminationComplete(examination),
    },
    ...(clinicType === "DENTAL"
      ? [
          {
            id: "dental-chart",
            label: "Dental Chart",
            shortLabel: "Dental",
            isRequired: false,
            isComplete: Object.keys(dentalChart).length > 0,
          },
        ]
      : []),
    ...(clinicType === "OPHTHALMOLOGY"
      ? [
          {
            id: "vision-exam",
            label: "Vision Exam",
            shortLabel: "Vision",
            isRequired: false,
            isComplete: Object.keys(eyeExam).length > 0,
          },
        ]
      : []),
    ...(clinicType === "PEDIATRIC"
      ? [
          {
            id: "growth-chart",
            label: "Growth Chart",
            shortLabel: "Growth",
            isRequired: false,
            isComplete: growthData.measurements.length > 0,
          },
        ]
      : []),
    {
      id: "diagnosis",
      label: "Diagnosis",
      shortLabel: "Diagnosis",
      isRequired: true,
      isComplete:
        diagnosis.length > 0 &&
        diagnosis.some((d) => d.condition.trim().length > 0),
    },
    {
      id: "treatment",
      label: "Treatment",
      shortLabel: "Treatment",
      isRequired: false,
      isComplete: treatment.trim().length > 0 || prescriptions.length > 0,
    },
  ], [chiefComplaint, history, examination, diagnosis, treatment, prescriptions, dentalChart, eyeExam, growthData, clinicType]);

  const progress = useMemo(() => {
    const completedCount = steps.filter((s) => s.isComplete).length;
    const requiredSteps = steps.filter((s) => s.isRequired);
    const requiredComplete = requiredSteps.filter((s) => s.isComplete).length;
    const isMinimumMet = requiredComplete === requiredSteps.length && requiredSteps.length > 0;
    const percentage =
      steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
    return {
      percentage,
      completedCount,
      totalCount: steps.length,
      requiredComplete,
      requiredCount: requiredSteps.length,
      isMinimumMet,
    };
  }, [steps]);

  const saveLabel = isSaving
    ? "Saving..."
    : progress.isMinimumMet
      ? "Complete Consultation"
      : "Save Draft";

  const rendererData = useMemo(
    () => ({
      chiefComplaint,
      history,
      examination,
      diagnosis,
      treatment,
      prescriptions,
      dentalChart,
      eyeExam,
      growthData,
    }),
    [
      chiefComplaint,
      history,
      examination,
      diagnosis,
      treatment,
      prescriptions,
      dentalChart,
      eyeExam,
      growthData,
    ],
  );

  const rendererHandlers = useMemo(
    () => ({
      setChiefComplaint,
      setHistory,
      setExamination,
      setDiagnosis,
      setTreatment,
      setPrescriptions,
      setDentalChart,
      setEyeExam,
      setGrowthData,
    }),
    [],
  );

  return (
    <div className={`space-y-4 ${isFocusMode ? "max-w-4xl mx-auto" : ""}`}>
      <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background/95 p-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
          <span className="font-medium text-foreground truncate">
            {progress.isMinimumMet ? "Ready to complete" : "Draft in progress"}
          </span>
          <span className="text-muted-foreground/50 hidden sm:inline">•</span>
          <span className="hidden sm:inline shrink-0">
            {progress.completedCount}/{progress.totalCount} sections complete
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4 shrink-0" />
            <Label htmlFor="whatsapp-summary" className="cursor-pointer hidden sm:inline">
              Send to WhatsApp
            </Label>
            <Switch
              id="whatsapp-summary"
              checked={sendToWhatsapp}
              onCheckedChange={setSendToWhatsapp}
            />
          </div>
          <Button
            size="sm"
            onClick={handleSaveData}
            disabled={isSaving}
            variant={progress.isMinimumMet ? "default" : "outline"}
          >
            {saveLabel}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="sticky top-0 z-10 border-b bg-background p-4 pb-0 space-y-3">
          <ConsultationProgressUI
            steps={steps}
            currentStepId={activeTab}
            progress={progress}
            onStepClick={setActiveTab}
          />
          <div className="flex overflow-x-auto no-scrollbar -mx-4 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab.icon}
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <ConsultationFormRenderer
            tabId={activeTab}
            data={rendererData}
            handlers={rendererHandlers}
            patient={patient}
            isLoading={isPatientLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
};
