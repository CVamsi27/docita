import type { Document } from "@workspace/types";
import { DOCUMENT_TYPE_LABELS } from "@workspace/types";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";

export function getDocumentTypeBadgeVariant(type: string) {
  switch (type?.toLowerCase()) {
    case "lab_report":
    case "lab report":
      return "default" as const;
    case "prescription":
      return "secondary" as const;
    case "xray":
    case "x-ray":
    case "scan":
    case "mri":
    case "ct":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

/** Human-readable document type label — never surface the raw enum (e.g. LAB_REPORT). */
export function formatDocumentTypeLabel(type: string): string {
  const match = Object.entries(DOCUMENT_TYPE_LABELS).find(
    ([key]) => key === type,
  );
  return match ? match[1] : humanizeUiLabel(type);
}

export function getDocumentTitle(document: Document) {
  return document.name || document.filename || document.title || "—";
}

export function getDocumentPatientName(document: Document) {
  return document.patient?.name || document.patient?.firstName || "—";
}
