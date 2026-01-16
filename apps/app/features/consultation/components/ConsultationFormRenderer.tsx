import React from "react";
import { DentalChartUI, DentalChartValue } from "./specialty/DentalChartUI";
import { GrowthChartUI } from "./specialty/GrowthChartUI";
import { VisionExamUI } from "./specialty/VisionExamUI";
import {
  ChiefComplaintInput,
  ChiefComplaintItem,
} from "./structured/ChiefComplaintInput";
import { DiagnosisInput, DiagnosisItem } from "./structured/DiagnosisInput";
import {
  ExaminationData,
  ExaminationInput,
} from "./structured/ExaminationInput";
import { Medication, PrescriptionInput } from "./structured/PrescriptionInput";
import { PatientMedicalHistoryContainer } from "../../patients/components/PatientMedicalHistoryContainer";
import { Textarea } from "@workspace/ui/components/textarea";
import { Patient } from "@workspace/types";

export interface ConsultationData {
  chiefComplaint: ChiefComplaintItem[];
  history: unknown; // Handled by PatientMedicalHistoryContainer using patient ID
  examination: ExaminationData;
  diagnosis: DiagnosisItem[];
  treatment: string; // Treatment notes
  prescriptions: Medication[];
  dentalChart: DentalChartValue;
  eyeExam: Record<string, unknown>;
  growthData: Record<string, unknown>;
}

export interface ConsultationHandlers {
  setChiefComplaint: (value: ChiefComplaintItem[]) => void;
  setHistory: (value: unknown) => void;
  setExamination: (value: ExaminationData) => void;
  setDiagnosis: (value: DiagnosisItem[]) => void;
  setTreatment: (value: string) => void;
  setPrescriptions: (value: Medication[]) => void;
  setDentalChart: (value: DentalChartValue) => void;
  setEyeExam: (value: unknown) => void;
  setGrowthData: (value: unknown) => void;
}

interface ConsultationFormRendererProps {
  tabId: string;
  data: ConsultationData;
  handlers: ConsultationHandlers;
  patient?: Patient;
}

export function ConsultationFormRenderer({
  tabId,
  data,
  handlers,
  patient,
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
      if (patient) {
        return (
          <PatientMedicalHistoryContainer patient={patient} readOnly={false} />
        );
      }
      return (
        <div className="flex items-center justify-center p-8 text-muted-foreground border rounded-md border-dashed">
          Patient data not available for medical history.
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
        <DentalChartUI
          value={data.dentalChart}
          onChange={handlers.setDentalChart}
        />
      );
    case "vision-exam":
      return (
        <VisionExamUI value={data.eyeExam} onChange={handlers.setEyeExam} />
      );
    case "growth-chart":
      return (
        <GrowthChartUI
          value={data.growthData}
          onChange={handlers.setGrowthData}
        />
      );
    case "diagnosis":
      return (
        <DiagnosisInput
          value={data.diagnosis}
          onChange={handlers.setDiagnosis}
        />
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
}
