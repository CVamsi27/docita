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
  Clock,
  FileText,
  Pill,
  Stethoscope,
  Eye,
  Smile,
  Baby,
} from "lucide-react";
import { ConsultationFormRenderer } from "./ConsultationFormRenderer";
import { DentalChartUI } from "./specialty/DentalChartUI";
import { VisionExamUI } from "./specialty/VisionExamUI";
import { GrowthChartUI } from "./specialty/GrowthChartUI";
import { CLINIC_TYPE_FEATURES, ClinicType } from "@workspace/types";

// ... (previous imports and types)

interface ClinicalDocumentationDynamicProps {
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
  // Make appointmentData optional but strongly recommended for functionality
  appointmentData?: any;
  defaultTab?: string;
  onSave?: (data: any) => Promise<void>;
  isFocusMode?: boolean;
  onToggleFocus?: () => void;
  clinicType?: string;
}

export const ClinicalDocumentationDynamic: FC<
  ClinicalDocumentationDynamicProps
> = ({
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

  // General Fields
  const [chiefComplaint, setChiefComplaint] = React.useState("");
  const [history, setHistory] = React.useState("");
  const [examination, setExamination] = React.useState("");
  const [diagnosis, setDiagnosis] = React.useState("");
  const [treatment, setTreatment] = React.useState("");

  // Specialty Fields
  const [dentalChart, setDentalChart] = React.useState<any>({});
  const [eyeExam, setEyeExam] = React.useState<any>({});
  const [growthData, setGrowthData] = React.useState<any>({});

  // Initialize data
  useEffect(() => {
    if (appointmentData) {
      setChiefComplaint(appointmentData.chiefComplaint || "");
      setHistory(appointmentData.historyOfPresentIllness || ""); // Mapping 'history' to HPI for simplicity, can span multiple fields
      setExamination(
        appointmentData.generalExamination
          ? JSON.stringify(appointmentData.generalExamination, null, 2)
          : "",
      ); // Placeholder for complex object
      setDiagnosis(appointmentData.finalDiagnosis || "");
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
      const dataToSave = {
        chiefComplaint,
        historyOfPresentIllness: history,
        // For general examination, if it's a string, we might need to parse it or save as notes.
        // For this MVP, we'll assume it's just notes or handle simplified saving.
        // If examination is just text, save to generalExamination.notes? Or just generalExamination (if it allowed string).
        // The DTO allows 'any' for generalExamination, so we can pass an object or string?
        // Actually DTO says 'any', so let's try to be robust.
        // If the user typed JSON manually (unlikely), we could parse it.
        // Better: let's map 'examination' text to 'generalExamination.generalNotes'
        generalExamination: { generalNotes: examination },

        finalDiagnosis: diagnosis,
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
      { id: "treatment", label: "Treatment", icon: Pill },
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
    dentalChart,
    eyeExam,
    growthData,
  };

  const formHandlers = {
    setChiefComplaint,
    setHistory,
    setExamination,
    setDiagnosis,
    setTreatment,
    setDentalChart,
    setEyeExam,
    setGrowthData,
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

interface ClinicalExaminationDynamicProps {
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
  defaultTab?: string;
  onSave?: () => Promise<void>;
  isFocusMode?: boolean;
  onToggleFocus?: () => void;
  clinicType?: string;
}

export const ClinicalExaminationDynamic: FC<
  ClinicalExaminationDynamicProps
> = ({ onSave }) => {
  const [general, setGeneral] = React.useState("");
  const [vitals, setVitals] = React.useState("");
  const [systemic, setSystemic] = React.useState("");
  const [local, setLocal] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Stethoscope className="h-5 w-5 text-primary" />
            <CardTitle>Clinical Examination</CardTitle>
          </div>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">General Appearance</label>
          <textarea
            className="w-full p-3 mt-1 rounded-md border bg-background min-h-[80px]"
            placeholder="Describe patient appearance, alertness, distress level..."
            value={general}
            onChange={(e) => setGeneral(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Vital Signs Notes</label>
          <textarea
            className="w-full p-3 mt-1 rounded-md border bg-background min-h-[60px]"
            placeholder="Additional notes about vital signs..."
            value={vitals}
            onChange={(e) => setVitals(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Systemic Examination</label>
          <textarea
            className="w-full p-3 mt-1 rounded-md border bg-background min-h-[100px]"
            placeholder="CVS, RS, GI, CNS, MSK findings..."
            value={systemic}
            onChange={(e) => setSystemic(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Local Examination</label>
          <textarea
            className="w-full p-3 mt-1 rounded-md border bg-background min-h-[100px]"
            placeholder="Site-specific examination findings..."
            value={local}
            onChange={(e) => setLocal(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
