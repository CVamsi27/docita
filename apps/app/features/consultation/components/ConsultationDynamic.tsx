"use client";

import React, { FC, useEffect, useState } from "react";
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
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import { fetchAPI } from "@/lib/api-core";
import {
  Appointment,
  GrowthChartData,
  OphthalmologyExamData,
  Patient,
} from "@workspace/types";

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

interface ConsultationAppointmentData extends Partial<Appointment> {
  chiefComplaintStructured?: ChiefComplaintItem[];
  growthData?: GrowthChartData;
  dentalChart?: DentalChartValue;
  ophthalmologyExam?: OphthalmologyExamData;
  generalExamination?: Record<string, unknown>;
  systemicExamination?: Record<string, unknown>;
  treatmentPlan?: string;
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
  _onToggleFocus,
  clinicType = "GENERAL",
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [viewMode, setViewMode] = useState<"tabs" | "scroll">("tabs");
  const [isSaving, setIsSaving] = useState(false);

  const [chiefComplaint, setChiefComplaint] = useState<ChiefComplaintItem[]>(
    [],
  );
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
  const [sendToWhatsapp, setSendToWhatsapp] = useState(false);

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
      if (appointmentData.chiefComplaintStructured) {
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
            const obj = val as Record<string, unknown>;
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

      const rawDiagnosis = (appointmentData as Record<string, unknown>).finalDiagnosis;
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
            instructions: p.instructions,
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
      console.error("Save error:", error);
      toast.error("Failed to save consultation");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    {
      id: "chief-complaint",
      label: "Chief Complaint",
      icon: <Activity className="h-4 w-4" />,
    },
    {
      id: "history",
      label: "History",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      id: "examination",
      label: "Examination",
      icon: <Stethoscope className="h-4 w-4" />,
    },
    ...(clinicType === "DENTAL"
      ? [{ id: "dental-chart", label: "Dental Chart", icon: <Smile className="h-4 w-4" /> }]
      : []),
    ...(clinicType === "OPHTHALMOLOGY"
      ? [{ id: "vision-exam", label: "Vision Exam", icon: <Eye className="h-4 w-4" /> }]
      : []),
    ...(clinicType === "PEDIATRIC"
      ? [{ id: "growth-chart", label: "Growth Chart", icon: <Baby className="h-4 w-4" /> }]
      : []),
    {
      id: "diagnosis",
      label: "Diagnosis",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "treatment",
      label: "Treatment",
      icon: <Pill className="h-4 w-4" />,
    },
  ];

  return (
    <div className={`space-y-4 ${isFocusMode ? "max-w-4xl mx-auto" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="whatsapp-summary"
              checked={sendToWhatsapp}
              onCheckedChange={setSendToWhatsapp}
            />
            <Label htmlFor="whatsapp-summary" className="text-sm">
              Send Summary to WhatsApp
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === "tabs" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("scroll")}
            >
              Scroll View
            </Button>
          )}
          {viewMode === "scroll" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("tabs")}
            >
              Tab View
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSaveData}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Consultation"}
          </Button>
        </div>
      </div>

      {viewMode === "tabs" ? (
        <Card className="border-none shadow-sm">
          <CardHeader className="p-0 border-b">
            <div className="flex overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ConsultationFormRenderer
              tabId={activeTab}
              data={{
                chiefComplaint,
                history,
                examination,
                diagnosis,
                treatment,
                prescriptions,
                dentalChart,
                eyeExam,
                growthData,
              }}
              handlers={{
                setChiefComplaint,
                setHistory,
                setExamination,
                setDiagnosis,
                setTreatment,
                setPrescriptions,
                setDentalChart,
                setEyeExam,
                setGrowthData,
              }}
              patient={patient}
              isLoading={isPatientLoading}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {tabs.map((tab) => (
            <Card key={tab.id} id={tab.id} className="border-none shadow-sm">
              <CardHeader className="bg-muted/30 py-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ConsultationFormRenderer
                  tabId={tab.id}
                  data={{
                    chiefComplaint,
                    history,
                    examination,
                    diagnosis,
                    treatment,
                    prescriptions,
                    dentalChart,
                    eyeExam,
                    growthData,
                  }}
                  handlers={{
                    setChiefComplaint,
                    setHistory,
                    setExamination,
                    setDiagnosis,
                    setTreatment,
                    setPrescriptions,
                    setDentalChart,
                    setEyeExam,
                    setGrowthData,
                  }}
                  patient={patient}
                  isLoading={isPatientLoading}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
