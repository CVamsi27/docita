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
