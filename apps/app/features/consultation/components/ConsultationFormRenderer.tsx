
import React from "react";
import { DentalChartUI } from "./specialty/DentalChartUI";
import { VisionExamUI } from "./specialty/VisionExamUI";
import { GrowthChartUI } from "./specialty/GrowthChartUI";

export interface ConsultationData {
  chiefComplaint: string;
  history: string;
  examination: string;
  diagnosis: string;
  treatment: string;
  dentalChart: any;
  eyeExam: any;
  growthData: any;
}

export interface ConsultationHandlers {
  setChiefComplaint: (value: string) => void;
  setHistory: (value: string) => void;
  setExamination: (value: string) => void;
  setDiagnosis: (value: string) => void;
  setTreatment: (value: string) => void;
  setDentalChart: (value: any) => void;
  setEyeExam: (value: any) => void;
  setGrowthData: (value: any) => void;
}

interface ConsultationFormRendererProps {
  tabId: string;
  data: ConsultationData;
  handlers: ConsultationHandlers;
}

export function ConsultationFormRenderer({
  tabId,
  data,
  handlers,
}: ConsultationFormRendererProps) {
  switch (tabId) {
    case "chief-complaint":
      return (
        <textarea
          className="w-full min-h-[200px] p-3 rounded-md border bg-background resize-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
          placeholder="Enter the patient's chief complaint..."
          value={data.chiefComplaint}
          onChange={(e) => handlers.setChiefComplaint(e.target.value)}
        />
      );
    case "history":
      return (
        <textarea
          className="w-full min-h-[200px] p-3 rounded-md border bg-background resize-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
          placeholder="Enter patient history..."
          value={data.history}
          onChange={(e) => handlers.setHistory(e.target.value)}
        />
      );
    case "examination":
      return (
        <textarea
          className="w-full min-h-[200px] p-3 rounded-md border bg-background resize-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
          placeholder="Enter examination findings..."
          value={data.examination}
          onChange={(e) => handlers.setExamination(e.target.value)}
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
        <textarea
          className="w-full min-h-[200px] p-3 rounded-md border bg-background resize-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
          placeholder="Enter diagnosis..."
          value={data.diagnosis}
          onChange={(e) => handlers.setDiagnosis(e.target.value)}
        />
      );
    case "treatment":
      return (
        <textarea
          className="w-full min-h-[200px] p-3 rounded-md border bg-background resize-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
          placeholder="Enter treatment plan..."
          value={data.treatment}
          onChange={(e) => handlers.setTreatment(e.target.value)}
        />
      );
    default:
      return null;
  }
}
