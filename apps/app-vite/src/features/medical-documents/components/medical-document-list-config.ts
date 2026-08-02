import { parseStringEnumMember } from "@workspace/utils";

export const MEDICAL_DOCUMENT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "secondary",
  SIGNED: "default",
  REVOKED: "destructive",
};

export const MEDICAL_DOCUMENT_TYPE_OPTIONS = [
  "MEDICAL_CERTIFICATE",
  "FITNESS_CERTIFICATE",
  "DISCHARGE_SUMMARY",
  "REFERRAL_LETTER",
  "SICK_NOTE",
  "OTHER",
] as const;

export const MEDICAL_DOCUMENT_TYPE_LABELS: Record<(typeof MEDICAL_DOCUMENT_TYPE_OPTIONS)[number], string> = {
  MEDICAL_CERTIFICATE: "Medical Certificate",
  FITNESS_CERTIFICATE: "Fitness Certificate",
  DISCHARGE_SUMMARY: "Discharge Summary",
  REFERRAL_LETTER: "Referral Letter",
  SICK_NOTE: "Sick Note",
  OTHER: "Others / custom",
};

export function medicalDocumentTypeLabel(type: string): string {
  const parsed = parseStringEnumMember(MEDICAL_DOCUMENT_TYPE_OPTIONS, type);
  return parsed ? MEDICAL_DOCUMENT_TYPE_LABELS[parsed] : type;
}
