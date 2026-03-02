import { z } from "zod";

export const codeStatusSchema = z.enum([
  "FULL_CODE",
  "DNR",
  "DNI",
  "DNR_DNI",
  "COMFORT_CARE",
]);
export type CodeStatus = z.infer<typeof codeStatusSchema>;

export const CODE_STATUS_LABELS: Record<CodeStatus, string> = {
  FULL_CODE: "Full Code",
  DNR: "DNR (Do Not Resuscitate)",
  DNI: "DNI (Do Not Intubate)",
  DNR_DNI: "DNR/DNI",
  COMFORT_CARE: "Comfort Care Only",
};

export const bpPositionSchema = z.enum([
  "SITTING",
  "STANDING",
  "LYING",
  "UNKNOWN",
]);
export type BpPosition = z.infer<typeof bpPositionSchema>;

export const BP_POSITION_LABELS: Record<BpPosition, string> = {
  SITTING: "Sitting",
  STANDING: "Standing",
  LYING: "Lying/Supine",
  UNKNOWN: "Unknown",
};

export const oxygenDeliverySchema = z.enum([
  "ROOM_AIR",
  "NASAL_CANNULA",
  "SIMPLE_MASK",
  "NON_REBREATHER",
  "VENTURI_MASK",
  "HIGH_FLOW",
  "CPAP",
  "BIPAP",
  "VENTILATOR",
  "OTHER",
]);
export type OxygenDelivery = z.infer<typeof oxygenDeliverySchema>;

export const OXYGEN_DELIVERY_LABELS: Record<OxygenDelivery, string> = {
  ROOM_AIR: "Room Air",
  NASAL_CANNULA: "Nasal Cannula",
  SIMPLE_MASK: "Simple Mask",
  NON_REBREATHER: "Non-Rebreather Mask",
  VENTURI_MASK: "Venturi Mask",
  HIGH_FLOW: "High-Flow Nasal Cannula",
  CPAP: "CPAP",
  BIPAP: "BiPAP",
  VENTILATOR: "Mechanical Ventilator",
  OTHER: "Other",
};

export const dosageFormSchema = z.enum([
  "TABLET",
  "CAPSULE",
  "SOLUTION",
  "SUSPENSION",
  "INJECTION",
  "CREAM",
  "OINTMENT",
  "GEL",
  "PATCH",
  "INHALER",
  "NEBULIZER",
  "SUPPOSITORY",
  "DROPS",
  "SPRAY",
  "POWDER",
  "LOZENGE",
  "FILM",
  "OTHER",
]);
export type DosageForm = z.infer<typeof dosageFormSchema>;

export const DOSAGE_FORM_LABELS: Record<DosageForm, string> = {
  TABLET: "Tablet",
  CAPSULE: "Capsule",
  SOLUTION: "Solution",
  SUSPENSION: "Suspension",
  INJECTION: "Injection",
  CREAM: "Cream",
  OINTMENT: "Ointment",
  GEL: "Gel",
  PATCH: "Patch",
  INHALER: "Inhaler",
  NEBULIZER: "Nebulizer Solution",
  SUPPOSITORY: "Suppository",
  DROPS: "Drops",
  SPRAY: "Spray",
  POWDER: "Powder",
  LOZENGE: "Lozenge",
  FILM: "Film",
  OTHER: "Other",
};

export const sigCodeSchema = z.enum([
  "QD",
  "BID",
  "TID",
  "QID",
  "Q4H",
  "Q6H",
  "Q8H",
  "Q12H",
  "QHS",
  "QAM",
  "QPM",
  "QOD",
  "QWK",
  "PRN",
  "STAT",
  "AC",
  "PC",
  "OTHER",
]);
export type SigCode = z.infer<typeof sigCodeSchema>;

export const SIG_CODE_LABELS: Record<SigCode, string> = {
  QD: "Once Daily",
  BID: "Twice Daily",
  TID: "Three Times Daily",
  QID: "Four Times Daily",
  Q4H: "Every 4 Hours",
  Q6H: "Every 6 Hours",
  Q8H: "Every 8 Hours",
  Q12H: "Every 12 Hours",
  QHS: "At Bedtime",
  QAM: "Every Morning",
  QPM: "Every Evening",
  QOD: "Every Other Day",
  QWK: "Once Weekly",
  PRN: "As Needed",
  STAT: "Immediately",
  AC: "Before Meals",
  PC: "After Meals",
  OTHER: "Other",
};

export const consentTypeSchema = z.enum([
  "TREATMENT",
  "PROCEDURE",
  "SURGERY",
  "ANESTHESIA",
  "HIPAA_RELEASE",
  "RESEARCH",
  "PHOTO_VIDEO",
  "TELEHEALTH",
  "MINOR_GUARDIAN",
  "BLOOD_TRANSFUSION",
  "VACCINATION",
]);
export type ConsentType = z.infer<typeof consentTypeSchema>;

export const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  TREATMENT: "General Treatment",
  PROCEDURE: "Procedure Consent",
  SURGERY: "Surgical Consent",
  ANESTHESIA: "Anesthesia Consent",
  HIPAA_RELEASE: "HIPAA Information Release",
  RESEARCH: "Research Participation",
  PHOTO_VIDEO: "Photo/Video Consent",
  TELEHEALTH: "Telemedicine Consent",
  MINOR_GUARDIAN: "Guardian Consent for Minor",
  BLOOD_TRANSFUSION: "Blood Transfusion Consent",
  VACCINATION: "Vaccination Consent",
};

export const consentStatusSchema = z.enum([
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
  "PENDING",
]);
export type ConsentStatus = z.infer<typeof consentStatusSchema>;

export const CONSENT_STATUS_LABELS: Record<ConsentStatus, string> = {
  ACTIVE: "Active",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
  PENDING: "Pending Signature",
};

export const immunizationRouteSchema = z.enum([
  "IM",
  "SC",
  "ID",
  "PO",
  "IN",
  "OTHER",
]);
export type ImmunizationRoute = z.infer<typeof immunizationRouteSchema>;

export const IMMUNIZATION_ROUTE_LABELS: Record<ImmunizationRoute, string> = {
  IM: "Intramuscular",
  SC: "Subcutaneous",
  ID: "Intradermal",
  PO: "Oral",
  IN: "Intranasal",
  OTHER: "Other",
};

export const immunizationSiteSchema = z.enum([
  "LEFT_ARM",
  "RIGHT_ARM",
  "LEFT_THIGH",
  "RIGHT_THIGH",
  "LEFT_DELTOID",
  "RIGHT_DELTOID",
  "OTHER",
]);
export type ImmunizationSite = z.infer<typeof immunizationSiteSchema>;

export const IMMUNIZATION_SITE_LABELS: Record<ImmunizationSite, string> = {
  LEFT_ARM: "Left Arm",
  RIGHT_ARM: "Right Arm",
  LEFT_THIGH: "Left Thigh",
  RIGHT_THIGH: "Right Thigh",
  LEFT_DELTOID: "Left Deltoid",
  RIGHT_DELTOID: "Right Deltoid",
  OTHER: "Other",
};
