import { parseStringEnumMember } from "@workspace/utils";
import { MEDICAL_DOCUMENT_TYPE_OPTIONS } from "../components/medical-document-list-config";

/** Resolve a medical-document type to a translated label (MedicalDocuments.documentTypes). */
export function medicalDocumentTypeLabel(
  type: string,
  t: (key: string) => string,
): string {
  const parsed = parseStringEnumMember(MEDICAL_DOCUMENT_TYPE_OPTIONS, type);
  switch (parsed) {
    case "MEDICAL_CERTIFICATE":
      return t("documentTypes.medicalCertificate");
    case "FITNESS_CERTIFICATE":
      return t("documentTypes.fitnessCertificate");
    case "DISCHARGE_SUMMARY":
      return t("documentTypes.dischargeSummary");
    case "REFERRAL_LETTER":
      return t("documentTypes.referralLetter");
    case "SICK_NOTE":
      return t("documentTypes.sickNote");
    case "OTHER":
      return t("documentTypes.other");
    default:
      return type;
  }
}
