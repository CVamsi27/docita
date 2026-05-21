

import type { ClinicType } from "@workspace/types";

const CLINIC_TYPE_KEYS: ClinicType[] = [
  "GENERAL",
  "DENTAL",
  "PEDIATRIC",
  "ORTHOPEDIC",
  "CARDIOLOGY",
  "DERMATOLOGY",
  "ENT",
  "GYNECOLOGY",
  "OPHTHALMOLOGY",
  "PSYCHIATRY",
  "SPECIALTY",
];

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
  { tag: "Chronic", category: "Priority", color: "var(--tag-rose)" },
  { tag: "Follow-up", category: "Status", color: "var(--tag-sky)" },
  { tag: "New Patient", category: "Status", color: "var(--tag-emerald)" },
  { tag: "Urgent", category: "Priority", color: "var(--tag-amber)" },
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
      { tag: "Diabetic", color: "var(--tag-amber)" },
      { tag: "Hypertensive", color: "var(--tag-violet)" },
      { tag: "Elderly", color: "var(--tag-slate)" },
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
      { tag: "Orthodontic", color: "var(--tag-teal)" },
      { tag: "Root Canal", color: "var(--tag-violet)" },
      { tag: "Implant", color: "var(--tag-pink)" },
      { tag: "Periodontal", color: "var(--tag-amber)" },
    ],
    defaultExaminationFields: ["oral"],
    supportsGrowthChart: false,
    supportsDentalChart: true,
    supportsVisionExam: false,
  },
  PEDIATRIC: {
    specialtySections: [],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Pediatric", color: "var(--tag-emerald)" },
      { tag: "Vaccination Due", color: "var(--tag-amber)" },
      { tag: "Developmental Delay", color: "var(--tag-violet)" },
      { tag: "Premature", color: "var(--tag-pink)" },
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
    specialtySections: [],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Glaucoma", color: "var(--tag-rose)" },
      { tag: "Cataract", color: "var(--tag-violet)" },
      { tag: "Diabetic Retinopathy", color: "var(--tag-amber)" },
      { tag: "Post-Surgery", color: "var(--tag-teal)" },
    ],
    defaultExaminationFields: ["vision", "anterior", "posterior", "iop"],
    supportsGrowthChart: false,
    supportsDentalChart: false,
    supportsVisionExam: true,
  },
  CARDIOLOGY: {
    specialtySections: [],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Heart Failure", color: "var(--tag-rose)" },
      { tag: "Arrhythmia", color: "var(--tag-violet)" },
      { tag: "Post-MI", color: "var(--tag-amber)" },
      { tag: "On Anticoagulants", color: "var(--tag-pink)" },
    ],
    defaultExaminationFields: ["cvs", "general", "peripheral"],
    supportsGrowthChart: false,
    supportsDentalChart: false,
    supportsVisionExam: false,
  },
  GYNECOLOGY: {
    specialtySections: [],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Pregnant", color: "var(--tag-pink)" },
      { tag: "High-Risk Pregnancy", color: "var(--tag-rose)" },
      { tag: "Postpartum", color: "var(--tag-violet)" },
      { tag: "Menopause", color: "var(--tag-amber)" },
    ],
    defaultExaminationFields: ["general", "abdominal", "pelvic"],
    supportsGrowthChart: false,
    supportsDentalChart: false,
    supportsVisionExam: false,
  },
  PSYCHIATRY: {
    specialtySections: [],
    presetTags: [
      ...BASE_PRESET_TAGS,
      { tag: "Depression", color: "var(--tag-slate)" },
      { tag: "Anxiety", color: "var(--tag-amber)" },
      { tag: "Bipolar", color: "var(--tag-violet)" },
      { tag: "Substance Use", color: "var(--tag-rose)" },
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
      { tag: "Post-Surgery", color: "var(--tag-teal)" },
      { tag: "Fracture", color: "var(--tag-rose)" },
      { tag: "Arthritis", color: "var(--tag-violet)" },
      { tag: "Sports Injury", color: "var(--tag-amber)" },
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
      { tag: "Eczema", color: "var(--tag-amber)" },
      { tag: "Psoriasis", color: "var(--tag-violet)" },
      { tag: "Skin Cancer", color: "var(--tag-rose)" },
      { tag: "Acne", color: "var(--tag-teal)" },
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
      { tag: "Hearing Loss", color: "var(--tag-violet)" },
      { tag: "Sinusitis", color: "var(--tag-amber)" },
      { tag: "Tinnitus", color: "var(--tag-rose)" },
      { tag: "Post-Surgery", color: "var(--tag-teal)" },
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
      { tag: "Specialist Care", color: "var(--tag-violet)" },
      { tag: "Referral", color: "var(--tag-teal)" },
      { tag: "Multi-disciplinary", color: "var(--tag-amber)" },
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
    return CLINIC_TYPE_KEYS;
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
