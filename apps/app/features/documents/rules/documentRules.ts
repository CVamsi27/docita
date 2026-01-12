/**
 * Document Business Rules
 * File validation, categorization, and metadata handling
 */

export type DocumentType =
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

export interface Document {
    id: string;
    name: string;
    type: DocumentType;
    mimeType: string;
    size: number;
    url: string;
    patientId: string;
    appointmentId?: string;
    uploadedAt: Date;
    extractedText?: string;
}

/**
 * Allowed file extensions
 */
export const ALLOWED_EXTENSIONS = [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
];

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validate file extension
 */
export function isValidFileExtension(filename: string): boolean {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
    return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Validate file size
 */
export function isValidFileSize(size: number): boolean {
    return size <= MAX_FILE_SIZE;
}

/**
 * Get document type label
 */
export function getDocumentTypeLabel(type: DocumentType): string {
    const labels: Record<DocumentType, string> = {
        lab_report: "Lab Report",
        prescription: "Prescription",
        discharge_summary: "Discharge Summary",
        consultation_note: "Consultation Note",
        imaging: "Medical Imaging",
        xray: "X-Ray",
        mri: "MRI",
        ct_scan: "CT Scan",
        ultrasound: "Ultrasound",
        insurance: "Insurance Document",
        consent_form: "Consent Form",
        referral: "Referral Letter",
        other: "Other",
    };
    return labels[type] || "Document";
}

/**
 * Detect document type from filename
 */
export function detectDocumentType(filename: string): DocumentType {
    const lower = filename.toLowerCase();

    if (lower.includes("lab") || lower.includes("report") || lower.includes("result")) {
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

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get file icon based on type
 */
export function getFileIcon(mimeType: string): "image" | "pdf" | "document" | "file" {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType.includes("word") || mimeType.includes("document")) return "document";
    return "file";
}
