

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
  rvu?: number; 
}

export function isValidICD10Code(code: string): boolean {

  const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,4})?$/i;
  return icd10Pattern.test(code);
}

export function isValidCPTCode(code: string): boolean {

  const cptPattern = /^\d{5}(-\d{2})?$/;
  return cptPattern.test(code);
}

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

export function formatDiagnosisCode(code: string): string {

  if (code.length > 3 && !code.includes(".")) {
    return `${code.slice(0, 3)}.${code.slice(3)}`;
  }
  return code.toUpperCase();
}

export function requiresMoreSpecificity(code: string): boolean {

  const parts = code.split(".");
  if (parts.length === 1) return true; 
  return (parts[1]?.length ?? 0) < 2;
}

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
