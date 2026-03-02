import { z } from "zod";

export const documentTypeSchema = z.enum([

  "PRESCRIPTION",
  "LAB_REPORT",
  "INVOICE",
  "CONSENT_FORM",
  "MEDICAL_RECORD",
  "INSURANCE_CARD",
  "ID_PROOF",
  "REFERRAL_LETTER",
  "DISCHARGE_SUMMARY",

  "XRAY_INTRAORAL_PERIAPICAL",
  "XRAY_INTRAORAL_BITEWING",
  "XRAY_INTRAORAL_OCCLUSAL",

  "XRAY_PANORAMIC",
  "XRAY_CEPHALOMETRIC",
  "XRAY_CBCT",

  "XRAY_CHEST",
  "XRAY_SKELETAL",
  "XRAY_SPINE",
  "XRAY_ABDOMEN",
  "XRAY_OTHER",

  "OTHER",
]);

export type DocumentType = z.infer<typeof documentTypeSchema>;

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {

  PRESCRIPTION: "Prescription",
  LAB_REPORT: "Lab Report",
  INVOICE: "Invoice",
  CONSENT_FORM: "Consent Form",
  MEDICAL_RECORD: "Medical Record",
  INSURANCE_CARD: "Insurance Card",
  ID_PROOF: "ID Proof",
  REFERRAL_LETTER: "Referral Letter",
  DISCHARGE_SUMMARY: "Discharge Summary",

  XRAY_INTRAORAL_PERIAPICAL: "X-ray - Periapical",
  XRAY_INTRAORAL_BITEWING: "X-ray - Bitewing",
  XRAY_INTRAORAL_OCCLUSAL: "X-ray - Occlusal",

  XRAY_PANORAMIC: "X-ray - Panoramic (OPG)",
  XRAY_CEPHALOMETRIC: "X-ray - Cephalometric (Ceph)",
  XRAY_CBCT: "X-ray - CBCT Scan",

  XRAY_CHEST: "X-ray - Chest",
  XRAY_SKELETAL: "X-ray - Skeletal",
  XRAY_SPINE: "X-ray - Spine",
  XRAY_ABDOMEN: "X-ray - Abdomen",
  XRAY_OTHER: "X-ray - Other",

  OTHER: "Other Document",
};

export const DOCUMENT_TYPE_CATEGORIES = {
  ALL_XRAYS: [
    "XRAY_INTRAORAL_PERIAPICAL",
    "XRAY_INTRAORAL_BITEWING",
    "XRAY_INTRAORAL_OCCLUSAL",
    "XRAY_PANORAMIC",
    "XRAY_CEPHALOMETRIC",
    "XRAY_CBCT",
    "XRAY_CHEST",
    "XRAY_SKELETAL",
    "XRAY_SPINE",
    "XRAY_ABDOMEN",
    "XRAY_OTHER",
  ] as const,

  DENTAL_XRAYS: [
    "XRAY_INTRAORAL_PERIAPICAL",
    "XRAY_INTRAORAL_BITEWING",
    "XRAY_INTRAORAL_OCCLUSAL",
    "XRAY_PANORAMIC",
    "XRAY_CEPHALOMETRIC",
    "XRAY_CBCT",
  ] as const,

  INTRAORAL_XRAYS: [
    "XRAY_INTRAORAL_PERIAPICAL",
    "XRAY_INTRAORAL_BITEWING",
    "XRAY_INTRAORAL_OCCLUSAL",
  ] as const,

  EXTRAORAL_XRAYS: [
    "XRAY_PANORAMIC",
    "XRAY_CEPHALOMETRIC",
    "XRAY_CBCT",
  ] as const,

  MEDICAL_XRAYS: [
    "XRAY_CHEST",
    "XRAY_SKELETAL",
    "XRAY_SPINE",
    "XRAY_ABDOMEN",
    "XRAY_OTHER",
  ] as const,

  GENERAL_DOCUMENTS: [
    "PRESCRIPTION",
    "LAB_REPORT",
    "INVOICE",
    "CONSENT_FORM",
    "MEDICAL_RECORD",
    "INSURANCE_CARD",
    "ID_PROOF",
    "REFERRAL_LETTER",
    "DISCHARGE_SUMMARY",
    "OTHER",
  ] as const,
};

export const DOCUMENT_TYPE_DESCRIPTIONS: Record<DocumentType, string> = {
  PRESCRIPTION: "Prescription documents and medication orders",
  LAB_REPORT: "Laboratory test results and reports",
  INVOICE: "Billing invoices and receipts",
  CONSENT_FORM: "Signed consent forms for procedures",
  MEDICAL_RECORD: "General medical records and history",
  INSURANCE_CARD: "Insurance cards and policy documents",
  ID_PROOF: "Government ID proofs and identification",
  REFERRAL_LETTER: "Referral letters from other physicians",
  DISCHARGE_SUMMARY: "Hospital discharge summaries",

  XRAY_INTRAORAL_PERIAPICAL:
    "Periapical radiographs showing entire tooth and surrounding bone",
  XRAY_INTRAORAL_BITEWING:
    "Bitewing radiographs showing crowns of upper and lower teeth",
  XRAY_INTRAORAL_OCCLUSAL: "Occlusal radiographs showing roof/floor of mouth",

  XRAY_PANORAMIC:
    "Panoramic radiographs (OPG) showing entire mouth in single image",
  XRAY_CEPHALOMETRIC: "Cephalometric radiographs for orthodontic analysis",
  XRAY_CBCT: "Cone Beam CT scans for 3D dental imaging",

  XRAY_CHEST: "Chest X-rays for respiratory and cardiac assessment",
  XRAY_SKELETAL: "Skeletal X-rays for bone structure evaluation",
  XRAY_SPINE: "Spine X-rays for spinal column assessment",
  XRAY_ABDOMEN: "Abdominal X-rays for internal organ visualization",
  XRAY_OTHER: "Other types of radiographic images",

  OTHER: "Other document types not categorized above",
};

export function isXRayDocument(type: DocumentType): boolean {
  return (DOCUMENT_TYPE_CATEGORIES.ALL_XRAYS as readonly string[]).includes(
    type,
  );
}

export function isDentalXRay(type: DocumentType): boolean {
  return (DOCUMENT_TYPE_CATEGORIES.DENTAL_XRAYS as readonly string[]).includes(
    type,
  );
}

export function isMedicalXRay(type: DocumentType): boolean {
  return (DOCUMENT_TYPE_CATEGORIES.MEDICAL_XRAYS as readonly string[]).includes(
    type,
  );
}

export function getDocumentCategory(type: DocumentType): string {
  if (
    (DOCUMENT_TYPE_CATEGORIES.DENTAL_XRAYS as readonly string[]).includes(type)
  ) {
    return "Dental X-rays";
  }
  if (
    (DOCUMENT_TYPE_CATEGORIES.MEDICAL_XRAYS as readonly string[]).includes(type)
  ) {
    return "Medical X-rays";
  }
  if (
    (DOCUMENT_TYPE_CATEGORIES.GENERAL_DOCUMENTS as readonly string[]).includes(
      type,
    )
  ) {
    return "General Documents";
  }
  return "Other";
}

export const documentSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  type: documentTypeSchema,
  name: z.string(),
  title: z.string().optional(),
  url: z.string(), 
  filename: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).optional(),
  metadata: z.record(z.unknown()).optional(),
  uploadedBy: z.string().optional(),
  patient: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    })
    .optional(),
});

export type Document = z.infer<typeof documentSchema>;
