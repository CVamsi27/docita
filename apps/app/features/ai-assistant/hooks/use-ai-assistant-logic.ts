import { useState } from "react";

import { DrugInteraction, PrescriptionSuggestion } from "@workspace/types";

export interface DiagnosisSuggestion {
  condition: string;
  icdCode: string;
  confidence: number;
  reasoning: string;
}

export type { DrugInteraction, PrescriptionSuggestion };

export const useAIAssistantLogic = () => {
  const [activeTab, setActiveTab] = useState("prescription");
  const [isLoading, setIsLoading] = useState(false);

  // Prescription Assistant State
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [prescriptionSuggestions, setPrescriptionSuggestions] = useState<
    PrescriptionSuggestion[]
  >([]);
  const [drugInteractions, setDrugInteractions] = useState<DrugInteraction[]>(
    [],
  );

  // Diagnosis Assistant State
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [vitalSigns, setVitalSigns] = useState("");
  const [examFindings, setExamFindings] = useState("");
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState<
    DiagnosisSuggestion[]
  >([]);

  // Smart Task State
  const [taskType, setTaskType] = useState("");

  const handlePrescriptionAnalysis = async () => {
    setIsLoading(true);
    // Simulate AI API analysis
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setPrescriptionSuggestions([
      {
        medication: "Amoxicillin",
        dosage: "500mg",
        frequency: "TID (Three times daily)",
        duration: "7 days",
        route: "Oral",
        notes: "Take with food to reduce GI upset",
      },
      {
        medication: "Ibuprofen",
        dosage: "400mg",
        frequency: "PRN (As needed)",
        duration: "5 days",
        route: "Oral",
        notes: "Maximum 3 doses per day. Take with food.",
      },
    ]);

    setDrugInteractions([
      {
        drug1: "Amoxicillin",
        drug2: "Warfarin",
        severity: "moderate",
        description:
          "Amoxicillin may increase the anticoagulant effect of warfarin. Monitor INR closely.",
      },
    ]);

    setIsLoading(false);
  };

  const handleDiagnosisAnalysis = async () => {
    setIsLoading(true);
    // Simulate AI API analysis
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setDiagnosisSuggestions([
      {
        condition: "Acute Pharyngitis",
        icdCode: "J02.9",
        confidence: 85,
        reasoning:
          "Sore throat, fever, and examination findings consistent with pharyngeal inflammation.",
      },
      {
        condition: "Upper Respiratory Infection",
        icdCode: "J06.9",
        confidence: 72,
        reasoning:
          "Symptoms of cough, congestion, and mild fever suggest viral URI.",
      },
      {
        condition: "Streptococcal Pharyngitis",
        icdCode: "J02.0",
        confidence: 45,
        reasoning:
          "Consider if rapid strep test is positive. Absence of cough increases likelihood.",
      },
    ]);

    setIsLoading(false);
  };

  return {
    state: {
      activeTab,
      isLoading,
      symptoms,
      diagnosis,
      currentMedications,
      allergies,
      prescriptionSuggestions,
      drugInteractions,
      chiefComplaint,
      vitalSigns,
      examFindings,
      diagnosisSuggestions,
      taskType,
    },
    handlers: {
      setActiveTab,
      setSymptoms,
      setDiagnosis,
      setCurrentMedications,
      setAllergies,
      setChiefComplaint,
      setVitalSigns,
      setExamFindings,
      setTaskType,
      handlePrescriptionAnalysis,
      handleDiagnosisAnalysis,
    },
  };
};
