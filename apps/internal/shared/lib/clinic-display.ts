import {
  CLINIC_TYPE_LABELS,
  clinicTypeSchema,
  type ClinicType,
} from "@workspace/types";

/** Marketing descriptions for internal clinic create/edit selects. */
export const CLINIC_TYPE_DESCRIPTIONS: Partial<Record<ClinicType, string>> = {
  GENERAL: "Multi-specialty facility",
  DENTAL: "Dentistry & Orthodontics",
  PEDIATRIC: "Child Health",
  ORTHOPEDIC: "Bone & Joint Specialist",
  CARDIOLOGY: "Heart Specialist",
  DERMATOLOGY: "Skin Care",
  ENT: "Ear, Nose & Throat",
  GYNECOLOGY: "Women's Health",
  OPHTHALMOLOGY: "Eye Care",
  PSYCHIATRY: "Mental Health",
  SPECIALTY: "Custom specialty facility",
};

export function getInternalClinicTypeDisplay(type?: string): {
  name: string;
  className: string;
} {
  const parsedType = clinicTypeSchema.safeParse((type || "GENERAL").toUpperCase());
  const normalizedType: ClinicType = parsedType.success
    ? parsedType.data
    : "GENERAL";
  const typeLabels: Record<string, { name: string; className: string }> = {
    GENERAL: { name: CLINIC_TYPE_LABELS.GENERAL, className: "badge-muted" },
    DENTAL: { name: CLINIC_TYPE_LABELS.DENTAL, className: "badge-info" },
    PEDIATRIC: { name: CLINIC_TYPE_LABELS.PEDIATRIC, className: "tier-intelligence" },
    ORTHOPEDIC: { name: CLINIC_TYPE_LABELS.ORTHOPEDIC, className: "tier-core" },
    CARDIOLOGY: { name: CLINIC_TYPE_LABELS.CARDIOLOGY, className: "badge-danger" },
    DERMATOLOGY: { name: CLINIC_TYPE_LABELS.DERMATOLOGY, className: "badge-warning" },
    ENT: { name: CLINIC_TYPE_LABELS.ENT, className: "tier-plus" },
    GYNECOLOGY: { name: CLINIC_TYPE_LABELS.GYNECOLOGY, className: "tier-pro" },
    OPHTHALMOLOGY: { name: CLINIC_TYPE_LABELS.OPHTHALMOLOGY, className: "tier-core" },
    PSYCHIATRY: { name: CLINIC_TYPE_LABELS.PSYCHIATRY, className: "tier-pro" },
    SPECIALTY: { name: CLINIC_TYPE_LABELS.SPECIALTY, className: "tier-plus" },
  };
  return typeLabels[normalizedType] ?? { name: "General", className: "badge-muted" };
}
