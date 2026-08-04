import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from "@workspace/utils";

type DocumentType =
  | "lab_report"
  | "prescription"
  | "discharge_summary"
  | "consultation_note"
  | "imaging"
  | "xray"
  | "mri"
  | "ct_scan"
  | "ultrasound"
  | "insurance"
  | "consent_form"
  | "referral"
  | "other";

export function isValidFileExtension(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return ALLOWED_EXTENSIONS.includes(ext);
}

export function isValidFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

export function detectDocumentType(filename: string): DocumentType {
  const lower = filename.toLowerCase();

  if (
    lower.includes("lab") ||
    lower.includes("report") ||
    lower.includes("result")
  ) {
    return "lab_report";
  }
  if (lower.includes("prescription") || lower.includes("rx")) {
    return "prescription";
  }
  if (lower.includes("discharge")) {
    return "discharge_summary";
  }
  if (lower.includes("xray") || lower.includes("x-ray")) {
    return "xray";
  }
  if (lower.includes("mri")) {
    return "mri";
  }
  if (lower.includes("ct") || lower.includes("scan")) {
    return "ct_scan";
  }
  if (lower.includes("ultrasound") || lower.includes("usg")) {
    return "ultrasound";
  }
  if (lower.includes("insurance") || lower.includes("claim")) {
    return "insurance";
  }
  if (lower.includes("consent")) {
    return "consent_form";
  }
  if (lower.includes("refer")) {
    return "referral";
  }

  return "other";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(
  mimeType: string,
): "image" | "pdf" | "document" | "file" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "document";
  return "file";
}
