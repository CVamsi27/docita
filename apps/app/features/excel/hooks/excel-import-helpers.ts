export interface ColumnMapping {
  excelColumn: string;
  dbField: string | null;
  sampleValues: string[];
}

export interface ImportPreview {
  sessionId: string;
  columns: ColumnMapping[];
  suggestedMappings: Record<string, string>;
  totalRows: number;
  sampleData: Record<string, string | number | null>[];
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  duplicates: number;
  errors: string[];
  duplicateDetails: Array<{
    row: number;
    reason: string;
    existingPatient?: { id: string; name: string; phone: string };
  }>;
}

export type Step = "upload" | "mapping" | "importing" | "results";

export const DEFAULT_PATIENT_IMPORT_FIELDS = [
  { field: "firstName", label: "First Name", required: true, type: "text" },
  { field: "lastName", label: "Last Name", required: false, type: "text" },
  { field: "phoneNumber", label: "Phone Number", required: true, type: "phone" },
  { field: "email", label: "Email", required: false, type: "email" },
  { field: "dateOfBirth", label: "Date of Birth", required: false, type: "date" },
  { field: "gender", label: "Gender", required: false, type: "select" },
  { field: "bloodGroup", label: "Blood Group", required: false, type: "select" },
  { field: "address", label: "Address", required: false, type: "textarea" },
  { field: "allergies", label: "Allergies", required: false, type: "text" },
  { field: "medicalHistory", label: "Medical History", required: false, type: "textarea" },
];

export function hasRequiredMappings(
  columnMappings: Record<string, string>,
): boolean {
  const mappedFields = Object.values(columnMappings);
  return (
    mappedFields.includes("firstName") && mappedFields.includes("phoneNumber")
  );
}
