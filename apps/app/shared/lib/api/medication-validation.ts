import {
  getUserFacingErrorMessage,
  isRecord,
} from "@workspace/utils";
import { browserRequest } from "@/lib/auth/browser-request";
import {
  type ValidationResult,
  type ContraindicationResult,
  type ComprehensiveCheckResult,
  sanitizeValidationResult,
  sanitizeContraindicationResult,
  sanitizeComprehensiveCheckResult,
  parseValidationResult,
  parseContraindicationResults,
  parseComprehensiveCheckResult,
} from "./medication-validation-helpers";

export type {
  ValidationResult,
  ContraindicationResult,
  ComprehensiveCheckResult,
};

async function postMedicationValidation<T>(
  endpoint: string,
  payload: unknown,
  fallbackMessage: string,
  parseResult: (result: unknown) => T,
  sanitizeResult?: (result: T) => T,
): Promise<T> {
  const response = await browserRequest(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => ({}));
    const messageField = isRecord(errorBody) ? errorBody.message : undefined;
    const errorMessage = Array.isArray(messageField)
      ? messageField.filter((m) => typeof m === "string").join(", ")
      : typeof messageField === "string"
        ? messageField
        : undefined;
    throw new Error(
      getUserFacingErrorMessage(errorMessage, {
        fallback: fallbackMessage,
        context: "form",
      }),
    );
  }

  const result: unknown = await response.json();
  const typed = parseResult(result);
  return sanitizeResult ? sanitizeResult(typed) : typed;
}

export function validateMedicationDosage(payload: {
  medication: string;
  dosage: string;
}) {
  return postMedicationValidation(
    "/api/medications/validate-dosage",
    payload,
    "We could not check this dosage. Please try again.",
    parseValidationResult,
    sanitizeValidationResult,
  );
}

export function checkMedicationContraindications(payload: {
  medication: string;
  allergies?: string[];
  conditions?: string[];
  currentMedications?: string[];
  isPregnant?: boolean;
}) {
  return postMedicationValidation(
    "/api/medications/check-contraindications",
    payload,
    "We could not review this medicine right now. Please try again.",
    parseContraindicationResults,
    (results) => results.map(sanitizeContraindicationResult),
  );
}

export function checkMedicationInteractions(payload: {
  medications: Array<{ name: string; dosage?: string }>;
  patientAllergies?: string[];
}) {
  return postMedicationValidation(
    "/api/medications/check-interactions",
    payload,
    "We could not review these medicine interactions. Please try again.",
    (result) => result,
  );
}

export function runMedicationComprehensiveCheck(payload: {
  medications: Array<{ name: string; dosage: string }>;
  patientAllergies?: string[];
  currentMedications?: string[];
  isPregnant?: boolean;
  age?: number;
  weight?: number;
  renalFunction?: string;
}) {
  return postMedicationValidation(
    "/api/medications/comprehensive-check",
    payload,
    "We could not complete this medicine review. Please try again.",
    parseComprehensiveCheckResult,
    sanitizeComprehensiveCheckResult,
  );
}
