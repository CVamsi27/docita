/**
 * Contraindication Checking Engine
 * Hospital-grade medication contraindication validation
 * Checks patient conditions, allergies, and medication interactions
 */

export interface Allergy {
  name: string;
  severity: "mild" | "moderate" | "severe";
}

export interface PatientCondition {
  icdCode: string;
  name: string;
}

export interface ContraindicationCheck {
  isContraindicated: boolean;
  severity: "info" | "warning" | "critical";
  reason:
    | "allergy"
    | "condition"
    | "interaction"
    | "pregnancy"
    | "renal"
    | "hepatic";
  message: string;
  recommendation: string;
  alternatives?: string[];
}
