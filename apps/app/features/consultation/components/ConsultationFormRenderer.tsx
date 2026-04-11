"use client";

import React from "react";
import dynamic from "next/dynamic";
import {
  ChiefComplaintInput,
  type ChiefComplaintItem,
} from "./structured/ChiefComplaintInput";
import { DiagnosisInput, type DiagnosisItem } from "./structured/DiagnosisInput";
import {
  type ExaminationData,
  ExaminationInput,
} from "./structured/ExaminationInput";
import { type Medication, PrescriptionInput } from "./structured/PrescriptionInput";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  type GrowthChartData,
  type OphthalmologyExamData,
  type Patient,
} from "@workspace/types";
import type { DentalChartValue } from "./specialty/DentalChartUI";

function SectionLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  );
}

const DentalChartUILazy = dynamic(
  () => import("./specialty/DentalChartUI").then((m) => m.DentalChartUI),
  { ssr: false, loading: SectionLoading },
);
const GrowthChartUILazy = dynamic(
  () => import("./specialty/GrowthChartUI").then((m) => m.GrowthChartUI),
  { ssr: false, loading: SectionLoading },
);
const VisionExamUILazy = dynamic(
  () => import("./specialty/VisionExamUI").then((m) => m.VisionExamUI),
  { ssr: false, loading: SectionLoading },
);
const PatientMedicalHistoryContainerLazy = dynamic(
  () =>
    import(
      "@/features/patients/components/details/PatientMedicalHistoryContainer"
    ).then((m) => m.PatientMedicalHistoryContainer),
  { ssr: false, loading: SectionLoading },
);

export interface ConsultationData {
  chiefComplaint: ChiefComplaintItem[];
  history: string | null;
  examination: ExaminationData;
  diagnosis: DiagnosisItem[];
  treatment: string;
  prescriptions: Medication[];
  dentalChart: DentalChartValue;
  eyeExam: OphthalmologyExamData;
  growthData: GrowthChartData;
}

export interface ConsultationHandlers {
  setChiefComplaint: (value: ChiefComplaintItem[]) => void;
  setHistory: (value: string | null) => void;
  setExamination: (value: ExaminationData) => void;
  setDiagnosis: (value: DiagnosisItem[]) => void;
  setTreatment: (value: string) => void;
  setPrescriptions: (value: Medication[]) => void;
  setDentalChart: (value: DentalChartValue) => void;
  setEyeExam: (value: OphthalmologyExamData) => void;
  setGrowthData: (value: GrowthChartData) => void;
}

interface ConsultationFormRendererProps {
  tabId: string;
  data: ConsultationData;
  handlers: ConsultationHandlers;
  patient?: Patient;
  isLoading?: boolean;
}

export const ConsultationFormRenderer = React.memo(function ConsultationFormRenderer({
  tabId,
  data,
  handlers,
  patient,
  isLoading,
}: ConsultationFormRendererProps) {
  switch (tabId) {
    case "chief-complaint":
      return (
        <ChiefComplaintInput
          value={data.chiefComplaint}
          onChange={handlers.setChiefComplaint}
        />
      );
    case "history":
      if (isLoading && !patient) {
        return <SectionLoading />;
      }
      if (patient) {
        return (
          <PatientMedicalHistoryContainerLazy
            patient={patient}
            readOnly={false}
            variant="consultation"
          />
        );
      }
      return (
        <div className="flex items-center justify-center rounded-md border border-dashed p-8 text-muted-foreground">
          We could not load this patient&apos;s medical history.
        </div>
      );
    case "examination":
      return (
        <ExaminationInput
          value={data.examination}
          onChange={handlers.setExamination}
        />
      );
    case "dental-chart":
      return (
        <DentalChartUILazy
          value={data.dentalChart}
          onChange={handlers.setDentalChart}
        />
      );
    case "vision-exam":
      return (
        <VisionExamUILazy
          value={data.eyeExam}
          onChange={handlers.setEyeExam}
        />
      );
    case "growth-chart":
      return (
        <GrowthChartUILazy
          value={data.growthData}
          onChange={handlers.setGrowthData}
        />
      );
    case "diagnosis":
      return (
        <DiagnosisInput value={data.diagnosis} onChange={handlers.setDiagnosis} />
      );
    case "treatment":
      return (
        <div className="space-y-6">
          <PrescriptionInput
            value={data.prescriptions}
            onChange={handlers.setPrescriptions}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Treatment Notes / Plan
            </label>
            <Textarea
              className="min-h-[100px]"
              placeholder="Additional treatment instructions, referrals, or notes..."
              value={data.treatment}
              onChange={(e) => handlers.setTreatment(e.target.value)}
            />
          </div>
        </div>
      );
    default:
      return null;
  }
});
