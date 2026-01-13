/**
 * Medical Coding Business Rules
 * ICD-10, CPT code validation and utilities
 */

export interface DiagnosisCode {
  code: string;
  description: string;
  category: string;
  system: "ICD-10" | "ICD-9" | "SNOMED";
}

export interface ProcedureCode {
  code: string;
  description: string;
  category: string;
  system: "CPT" | "HCPCS" | "CDT";
  rvu?: number; // Relative Value Units
}

/**
 * Validate ICD-10 code format
 */
export function isValidICD10Code(code: string): boolean {
  // ICD-10 format: Letter + 2 digits + optional (. + up to 4 alphanumeric)
  const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,4})?$/i;
  return icd10Pattern.test(code);
}

/**
 * Validate CPT code format
 */
export function isValidCPTCode(code: string): boolean {
  // CPT format: 5 digits, optionally with modifier
  const cptPattern = /^\d{5}(-\d{2})?$/;
  return cptPattern.test(code);
}

/**
 * Get code category from ICD-10 code
 */
export function getICD10Category(code: string): string {
  const firstChar = code.charAt(0).toUpperCase();
  const categories: Record<string, string> = {
    A: "Infectious Diseases",
    B: "Infectious Diseases",
    C: "Neoplasms",
    D: "Blood/Immune Disorders",
    E: "Endocrine/Metabolic",
    F: "Mental/Behavioral",
    G: "Nervous System",
    H: "Eye/Ear",
    I: "Circulatory System",
    J: "Respiratory System",
    K: "Digestive System",
    L: "Skin",
    M: "Musculoskeletal",
    N: "Genitourinary",
    O: "Pregnancy/Childbirth",
    P: "Perinatal",
    Q: "Congenital Anomalies",
    R: "Symptoms/Signs",
    S: "Injury",
    T: "Injury/Poisoning",
    V: "External Causes",
    W: "External Causes",
    X: "External Causes",
    Y: "External Causes",
    Z: "Health Status/Services",
  };
  return categories[firstChar] || "Other";
}

/**
 * Format code for display
 */
export function formatDiagnosisCode(code: string): string {
  // Ensure proper formatting with period
  if (code.length > 3 && !code.includes(".")) {
    return `${code.slice(0, 3)}.${code.slice(3)}`;
  }
  return code.toUpperCase();
}

/**
 * Check if code requires additional specificity
 */
export function requiresMoreSpecificity(code: string): boolean {
  // Codes ending in a letter or with fewer than 4 characters after decimal may need more specificity
  const parts = code.split(".");
  if (parts.length === 1) return true; // No decimal, likely needs more specificity
  return parts[1]!.length < 2;
}

/**
 * Search codes by term
 */
export function searchCodes<T extends { code: string; description: string }>(
  codes: T[],
  searchTerm: string,
): T[] {
  const term = searchTerm.toLowerCase();
  return codes.filter(
    (c) =>
      c.code.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term),
  );
}
