

import type { ClinicType } from "@workspace/types";

export interface SpecialtySection {
  id: string;
  label: string;
  icon: string; 
  description?: string;
}

export interface PresetTag {
  tag: string;
  color: string;
  category?: string;
}

export interface ClinicFeatureConfig {
  specialtySections: SpecialtySection[];
  presetTags: PresetTag[];
  defaultExaminationFields: string[];
  supportsGrowthChart: boolean;
  supportsDentalChart: boolean;
  supportsVisionExam: boolean;
}

const BASE_PRESET_TAGS: PresetTag[] = [
  { tag: "Chronic", category: "Priority", color: "#ef4444" },
  { tag: "Follow-up", category: "Status", color: "#3b82f6" },
  { tag: "New Patient", category: "Status", color: "#10b981" },
  { tag: "Urgent", category: "Priority", color: "#f59e0b" },
];

export interface MedicationRoute {
  value: string;
  label: string;
  category: "Oral" | "Injectable" | "Topical" | "Respiratory" | "Other";
}

const MEDICATION_ROUTES: MedicationRoute[] = [

  { value: "ORAL", label: "Oral (PO)", category: "Oral" },
  { value: "SL", label: "Sublingual (SL)", category: "Oral" },

  { value: "IV", label: "Intravenous (IV)", category: "Injectable" },
  { value: "IM", label: "Intramuscular (IM)", category: "Injectable" },
  { value: "SC", label: "Subcutaneous (SC)", category: "Injectable" },

  { value: "TOPICAL", label: "Topical", category: "Topical" },
  { value: "TRANSDERMAL", label: "Transdermal (Patch)", category: "Topical" },
  { value: "OPHTHALMIC", label: "Ophthalmic (Eye)", category: "Topical" },
  { value: "OTIC", label: "Otic (Ear)", category: "Topical" },

  { value: "INHALED", label: "Inhaled", category: "Respiratory" },
  { value: "NEBULIZED", label: "Nebulized", category: "Respiratory" },
  { value: "NASAL", label: "Nasal", category: "Respiratory" },

  { value: "RECTAL", label: "Rectal (PR)", category: "Other" },
  { value: "OTHER", label: "Other", category: "Other" },
];

const CLINIC_DEFAULT_ROUTES: Record<string, string[]> = {
  GENERAL: ["ORAL", "IV", "IM", "TOPICAL"],
  DENTAL: ["TOPICAL", "ORAL", "IV", "IM"],
  PEDIATRIC: ["ORAL", "NEBULIZED", "TOPICAL", "IM"],
  OPHTHALMOLOGY: ["OPHTHALMIC", "TOPICAL", "ORAL", "IV"],
  CARDIOLOGY: ["ORAL", "IV", "SL", "TRANSDERMAL"],
  GYNECOLOGY: ["ORAL", "IV", "IM", "TOPICAL"],
  PSYCHIATRY: ["ORAL", "IM", "SL", "TRANSDERMAL"],
  ORTHOPEDIC: ["ORAL", "IM", "IV", "TOPICAL"],
  DERMATOLOGY: ["TOPICAL", "ORAL", "SC", "IV"],
  ENT: ["ORAL", "NASAL", "OTIC", "TOPICAL"],
  SPECIALTY: ["ORAL", "IV", "IM", "TOPICAL"],
};

const CLINIC_CONFIGS: Record<ClinicType, ClinicFeatureConfig> = {
  GENERAL: {
    specialtySections: [],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Diabetic", color: "#f59e0b" },
      { tag: "Hypertensive", color: "#8b5cf6" },
      { tag: "Elderly", color: "#64748b" },
    ],
    defaultExaminationFields: [
      "general",
      "cvs",
      "rs",
      "pa",
      "cns",
      "musculoskeletal",
    ],
    supportsGrowthChart: true,
    supportsDentalChart: false,
    supportsVisionExam: false,
  },
  DENTAL: {
    specialtySections: [
      {
        id: "dental-chart",
        label: "Dental Chart",
        icon: "Smile",
        description: "Tooth-by-tooth examination and treatment tracking",
      },
    ],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Orthodontic", color: "#06b6d4" },
      { tag: "Root Canal", color: "#8b5cf6" },
      { tag: "Implant", color: "#ec4899" },
      { tag: "Periodontal", color: "#f97316" },
    ],
    defaultExaminationFields: ["oral"],
    supportsGrowthChart: false,
    supportsDentalChart: true,
    supportsVisionExam: false,
  },
  PEDIATRIC: {
    specialtySections: [
      {
        id: "growth-chart",
        label: "Growth & Vitals",
        icon: "Baby",
        description: "Track growth percentiles and developmental milestones",
      },
    ],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Pediatric", color: "#10b981" },
      { tag: "Vaccination Due", color: "#f59e0b" },
      { tag: "Developmental Delay", color: "#8b5cf6" },
      { tag: "Premature", color: "#ec4899" },
    ],
    defaultExaminationFields: [
      "general",
      "cvs",
      "rs",
      "pa",
      "cns",
      "developmental",
    ],
    supportsGrowthChart: true,
    supportsDentalChart: false,
    supportsVisionExam: false,
  },
  OPHTHALMOLOGY: {
    specialtySections: [
      {
        id: "vision-exam",
        label: "Vision Exam",
        icon: "Eye",
        description: "Visual acuity and comprehensive eye examination",
      },
    ],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Glaucoma", color: "#ef4444" },
      { tag: "Cataract", color: "#8b5cf6" },
      { tag: "Diabetic Retinopathy", color: "#f59e0b" },
      { tag: "Post-Surgery", color: "#06b6d4" },
    ],
    defaultExaminationFields: ["vision", "anterior", "posterior", "iop"],
    supportsGrowthChart: false,
    supportsDentalChart: false,
    supportsVisionExam: true,
  },
  CARDIOLOGY: {
    specialtySections: [
      {
        id: "ecg-monitoring",
        label: "ECG Monitoring",
        icon: "Heart",
        description: "ECG interpretation and cardiac monitoring",
      },
    ],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Heart Failure", color: "#ef4444" },
      { tag: "Arrhythmia", color: "#8b5cf6" },
      { tag: "Post-MI", color: "#f97316" },
      { tag: "On Anticoagulants", color: "#ec4899" },
    ],
    defaultExaminationFields: ["cvs", "general", "peripheral"],
    supportsGrowthChart: false,
    supportsDentalChart: false,
    supportsVisionExam: false,
  },
  GYNECOLOGY: {
    specialtySections: [
      {
        id: "prenatal-care",
        label: "Prenatal Care",
        icon: "Baby",
        description: "Pregnancy tracking and prenatal monitoring",
      },
    ],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Pregnant", color: "#ec4899" },
      { tag: "High-Risk Pregnancy", color: "#ef4444" },
      { tag: "Postpartum", color: "#8b5cf6" },
      { tag: "Menopause", color: "#f59e0b" },
    ],
    defaultExaminationFields: ["general", "abdominal", "pelvic"],
    supportsGrowthChart: false,
    supportsDentalChart: false,
    supportsVisionExam: false,
  },
  PSYCHIATRY: {
    specialtySections: [
      {
        id: "mental-health",
        label: "Mental Health",
        icon: "Brain",
        description: "Mental status examination and assessment tools",
      },
    ],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Depression", color: "#64748b" },
      { tag: "Anxiety", color: "#f59e0b" },
      { tag: "Bipolar", color: "#8b5cf6" },
      { tag: "Substance Use", color: "#ef4444" },
    ],
    defaultExaminationFields: ["mental_status", "mood", "cognition"],
    supportsGrowthChart: false,
    supportsDentalChart: false,
    supportsVisionExam: false,
  },
  ORTHOPEDIC: {
    specialtySections: [],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Post-Surgery", color: "#06b6d4" },
      { tag: "Fracture", color: "#ef4444" },
      { tag: "Arthritis", color: "#8b5cf6" },
      { tag: "Sports Injury", color: "#f97316" },
    ],
    defaultExaminationFields: ["musculoskeletal", "neurological", "vascular"],
    supportsGrowthChart: false,
    supportsDentalChart: false,
    supportsVisionExam: false,
  },
  DERMATOLOGY: {
    specialtySections: [],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Eczema", color: "#f59e0b" },
      { tag: "Psoriasis", color: "#8b5cf6" },
      { tag: "Skin Cancer", color: "#ef4444" },
      { tag: "Acne", color: "#06b6d4" },
    ],
    defaultExaminationFields: ["skin", "nails", "hair", "mucosa"],
    supportsGrowthChart: false,
    supportsDentalChart: false,
    supportsVisionExam: false,
  },
  ENT: {
    specialtySections: [],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Hearing Loss", color: "#8b5cf6" },
      { tag: "Sinusitis", color: "#f59e0b" },
      { tag: "Tinnitus", color: "#ef4444" },
      { tag: "Post-Surgery", color: "#06b6d4" },
    ],
    defaultExaminationFields: ["ear", "nose", "throat", "neck"],
    supportsGrowthChart: false,
    supportsDentalChart: false,
    supportsVisionExam: false,
  },
  SPECIALTY: {
    specialtySections: [],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Specialist Care", color: "#8b5cf6" },
      { tag: "Referral", color: "#06b6d4" },
      { tag: "Multi-disciplinary", color: "#f59e0b" },
    ],
    defaultExaminationFields: ["general", "specialty_specific"],
    supportsGrowthChart: false,
    supportsDentalChart: false,
    supportsVisionExam: false,
  },
};

export const ClinicFeatureService = {
  
  getConfig(clinicType: ClinicType | undefined): ClinicFeatureConfig {
    return CLINIC_CONFIGS[clinicType || "GENERAL"] || CLINIC_CONFIGS.GENERAL;
  },

  
  getPresetTags(clinicType: ClinicType | undefined): PresetTag[] {
    const config = this.getConfig(clinicType);
    return config.presetTags;
  },

  
  getSpecialtySections(clinicType: ClinicType | undefined): SpecialtySection[] {
    const config = this.getConfig(clinicType);
    return config.specialtySections;
  },

  
  supportsFeature(
    clinicType: ClinicType | undefined,
    feature: "growthChart" | "dentalChart" | "visionExam",
  ): boolean {
    const config = this.getConfig(clinicType);
    switch (feature) {
      case "growthChart":
        return config.supportsGrowthChart;
      case "dentalChart":
        return config.supportsDentalChart;
      case "visionExam":
        return config.supportsVisionExam;
      default:
        return false;
    }
  },

  
  getAllClinicTypes(): ClinicType[] {
    return Object.keys(CLINIC_CONFIGS) as ClinicType[];
  },

  
  getMedicationRoutes(clinicType: ClinicType | undefined): MedicationRoute[] {
    const defaultRoutes =
      CLINIC_DEFAULT_ROUTES[clinicType || "GENERAL"] ||
      CLINIC_DEFAULT_ROUTES.GENERAL;

    return [...MEDICATION_ROUTES].sort((a, b) => {
      const aIndex = defaultRoutes.indexOf(a.value);
      const bIndex = defaultRoutes.indexOf(b.value);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });
  },

  
  getMedicationRoutesGrouped(
    clinicType: ClinicType | undefined,
  ): Record<string, MedicationRoute[]> {
    const routes = this.getMedicationRoutes(clinicType);
    const grouped: Record<string, MedicationRoute[]> = {};

    for (const route of routes) {
      if (!grouped[route.category]) {
        grouped[route.category] = [];
      }
      grouped[route.category].push(route);
    }

    return grouped;
  },

  
  getCategorizedTags(
    clinicType: ClinicType | undefined,
  ): Record<string, PresetTag[]> {
    const tags = this.getPresetTags(clinicType);
    const grouped: Record<string, PresetTag[]> = {};

    for (const tag of tags) {
      const category = tag.category || "General";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(tag);
    }

    return grouped;
  },
};

export { MEDICATION_ROUTES };

export default ClinicFeatureService;
