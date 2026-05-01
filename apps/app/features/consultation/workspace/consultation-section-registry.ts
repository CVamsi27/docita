import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Brain,
  ClipboardList,
  Layers,
  Pill,
  ScanSearch,
  Smile,
  Stethoscope,
  Target,
  TrendingUp,
  Eye,
} from "lucide-react";
import {
  CLINIC_TYPE_FEATURES,
  type ClinicType,
} from "@workspace/types";

export type ConsultationPersistKey =
  | "dentalChart"
  | "ophthalmologyExam"
  | "growthData"
  | "cardiologyExam"
  | "dermatologyExam"
  | "gynecologyExam"
  | "psychiatryExam"
  | "investigations";

export type ConsultationWorkspaceSectionId =
  | "subjective"
  | "objective"
  | "assessment"
  | "plan"
  | "specialty-dental"
  | "specialty-vision"
  | "specialty-growth"
  | "specialty-cardiology"
  | "specialty-dermatology"
  | "specialty-gynecology"
  | "specialty-psychiatry"
  | "specialty-investigations";

export interface ConsultationSection {
  id: ConsultationWorkspaceSectionId;
  label: string;
  shortLabel: string;
  letter: string;
  icon: LucideIcon;
  persistKey?: ConsultationPersistKey;
}

const SOAP_SUBJECTIVE: ConsultationSection = {
  id: "subjective",
  letter: "S",
  label: "Subjective",
  shortLabel: "Subjective",
  icon: ClipboardList,
};

const SOAP_OBJECTIVE: ConsultationSection = {
  id: "objective",
  letter: "O",
  label: "Objective",
  shortLabel: "Objective",
  icon: Stethoscope,
};

const SOAP_ASSESSMENT: ConsultationSection = {
  id: "assessment",
  letter: "A",
  label: "Assessment",
  shortLabel: "Assessment",
  icon: Target,
};

const SOAP_PLAN: ConsultationSection = {
  id: "plan",
  letter: "P",
  label: "Plan",
  shortLabel: "Plan",
  icon: Pill,
};

export function getConsultationSectionsForClinic(
  clinicType?: string | null,
): ConsultationSection[] {
  const key = (clinicType?.toUpperCase() ?? "GENERAL") as ClinicType;
  const features =
    CLINIC_TYPE_FEATURES[key] ?? CLINIC_TYPE_FEATURES.GENERAL;

  const middle: ConsultationSection[] = [];

  if (key === "DENTAL" && features.dentalChart) {
    middle.push({
      id: "specialty-dental",
      letter: "D",
      label: "Dental Chart",
      shortLabel: "Dental",
      icon: Smile,
      persistKey: "dentalChart",
    });
  }

  if (key === "OPHTHALMOLOGY" && features.ophthalmologyExam) {
    middle.push({
      id: "specialty-vision",
      letter: "V",
      label: "Vision Exam",
      shortLabel: "Vision",
      icon: Eye,
      persistKey: "ophthalmologyExam",
    });
  }

  if (key === "PEDIATRIC" && features.growthChart) {
    middle.push({
      id: "specialty-growth",
      letter: "G",
      label: "Growth Chart",
      shortLabel: "Growth",
      icon: TrendingUp,
      persistKey: "growthData",
    });
  }

  if (key === "CARDIOLOGY" && features.cardiologyExam) {
    middle.push({
      id: "specialty-cardiology",
      letter: "C",
      label: "Cardiology Exam",
      shortLabel: "Cardiac",
      icon: Activity,
      persistKey: "cardiologyExam",
    });
  }

  if (key === "DERMATOLOGY" && features.dermatologyExam) {
    middle.push({
      id: "specialty-dermatology",
      letter: "K",
      label: "Dermatology Exam",
      shortLabel: "Skin",
      icon: Layers,
      persistKey: "dermatologyExam",
    });
  }

  if (key === "GYNECOLOGY" && features.gynecologyExam) {
    middle.push({
      id: "specialty-gynecology",
      letter: "Y",
      label: "Gynecology Exam",
      shortLabel: "GYN",
      icon: Stethoscope,
      persistKey: "gynecologyExam",
    });
  }

  if (
    key === "PSYCHIATRY" &&
    (features.psychiatryExam || features.mentalStatusExam)
  ) {
    middle.push({
      id: "specialty-psychiatry",
      letter: "M",
      label: "Mental Status",
      shortLabel: "Psych",
      icon: Brain,
      persistKey: "psychiatryExam",
    });
  }

  if (
    features.imagingReview &&
    (key === "ORTHOPEDIC" || key === "ENT")
  ) {
    middle.push({
      id: "specialty-investigations",
      letter: "I",
      label: "Investigations",
      shortLabel: "Imaging",
      icon: ScanSearch,
      persistKey: "investigations",
    });
  }

  return [
    SOAP_SUBJECTIVE,
    SOAP_OBJECTIVE,
    ...middle,
    SOAP_ASSESSMENT,
    SOAP_PLAN,
  ];
}

export function getConsultationPersistKeysForClinic(
  clinicType?: string | null,
): ConsultationPersistKey[] {
  const keys: ConsultationPersistKey[] = [];
  for (const s of getConsultationSectionsForClinic(clinicType)) {
    if (s.persistKey) keys.push(s.persistKey);
  }
  return keys;
}
