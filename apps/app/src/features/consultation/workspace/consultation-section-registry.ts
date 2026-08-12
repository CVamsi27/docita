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
import type { ClinicTypeFeatures } from "@workspace/types";
import { resolveClinicTypeFeatures } from "@/features/consultation/lib/resolve-clinic-type-features";

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
  subtitle?: string;
  required?: boolean;
}

const SOAP_SUBJECTIVE: Omit<ConsultationSection, "subtitle"> = {
  id: "subjective",
  letter: "S",
  label: "Subjective",
  shortLabel: "Subjective",
  icon: ClipboardList,
  required: true,
};

const SOAP_OBJECTIVE: Omit<ConsultationSection, "subtitle"> = {
  id: "objective",
  letter: "O",
  label: "Objective",
  shortLabel: "Objective",
  icon: Stethoscope,
  required: false,
};

const SOAP_ASSESSMENT: Omit<ConsultationSection, "subtitle"> = {
  id: "assessment",
  letter: "A",
  label: "Assessment",
  shortLabel: "Assessment",
  icon: Target,
  required: true,
};

const SOAP_PLAN: Omit<ConsultationSection, "subtitle"> = {
  id: "plan",
  letter: "P",
  label: "Plan",
  shortLabel: "Plan",
  icon: Pill,
  required: true,
};

function soapLeadSections(features: ClinicTypeFeatures): ConsultationSection[] {
  const lead: ConsultationSection[] = [];
  if (features.chiefComplaint || features.history) {
    lead.push({
      ...SOAP_SUBJECTIVE,
      subtitle: "Patient reports",
    });
  }
  if (features.examination) {
    lead.push({
      ...SOAP_OBJECTIVE,
      subtitle: "Exam findings",
    });
  }
  return lead;
}

function soapTailSections(features: ClinicTypeFeatures): ConsultationSection[] {
  const tail: ConsultationSection[] = [];
  if (features.diagnosis) {
    tail.push({
      ...SOAP_ASSESSMENT,
      subtitle: "Diagnoses",
    });
  }
  if (features.treatment || features.prescriptions || features.followUp) {
    tail.push({
      ...SOAP_PLAN,
      subtitle: "Rx & follow-up",
    });
  }
  return tail;
}

export function getConsultationSectionsForClinic(
  clinicType?: string | null,
): ConsultationSection[] {
  const { key, features } = resolveClinicTypeFeatures(clinicType);

  const middle: ConsultationSection[] = [];

  if (key === "DENTAL" && features.dentalChart) {
    middle.push({
      id: "specialty-dental",
      letter: "D",
      label: "Dental Chart",
      shortLabel: "Dental",
      subtitle: "Tooth charting",
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
      subtitle: "Eye exam",
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
      subtitle: "Measurements",
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
      subtitle: "Cardiac findings",
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
      subtitle: "Skin exam",
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
      subtitle: "GYN exam",
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
      subtitle: "MSE",
      icon: Brain,
      persistKey: "psychiatryExam",
    });
  }

  if (features.investigations) {
    middle.push({
      id: "specialty-investigations",
      letter: "I",
      label: "Investigations",
      shortLabel: "Orders",
      subtitle: "Labs & imaging",
      icon: ScanSearch,
      persistKey: "investigations",
    });
  }

  return [
    ...soapLeadSections(features),
    ...middle,
    ...soapTailSections(features),
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
