import {
  getUserFacingErrorMessage,
  sanitizeUserFacingMessage,
} from "@workspace/types";

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  severity?: "warning" | "critical";
  suggestion?: string;
}

export interface ContraindicationResult {
  isContraindicated: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
  recommendation: string;
  alternatives?: string[];
}

export interface ComprehensiveCheckResult {
  dosageValidations: ValidationResult[];
  contraindications: ContraindicationResult[];
  warnings: string[];
  errors: string[];
  isApproved: boolean;
  requiresReview: boolean;
  summary: {
    totalMedications: number;
    validMedications: number;
    warnings: number;
    errors: number;
  };
}

interface ApiErrorResponse {
  message?: string | string[];
}

function sanitizeValidationResult(
  result: ValidationResult,
): ValidationResult {
  return {
    ...result,
    message: result.message
      ? sanitizeUserFacingMessage(
          result.message,
          "Please review this dosage before continuing.",
        )
      : undefined,
    suggestion: result.suggestion
      ? sanitizeUserFacingMessage(
          result.suggestion,
          "Please review this dosage before continuing.",
        )
      : undefined,
  };
}

function sanitizeContraindicationResult(
  result: ContraindicationResult,
): ContraindicationResult {
  return {
    ...result,
    message: sanitizeUserFacingMessage(
      result.message,
      "Please review this medicine before continuing.",
    ),
    recommendation: sanitizeUserFacingMessage(
      result.recommendation,
      "Please review this medicine before continuing.",
    ),
    alternatives: result.alternatives?.map((alternative) =>
      sanitizeUserFacingMessage(alternative, alternative),
    ),
  };
}

function sanitizeComprehensiveCheckResult(
  result: ComprehensiveCheckResult,
): ComprehensiveCheckResult {
  return {
    ...result,
    dosageValidations: result.dosageValidations.map(sanitizeValidationResult),
    contraindications: result.contraindications.map(
      sanitizeContraindicationResult,
    ),
    warnings: result.warnings.map((warning) =>
      sanitizeUserFacingMessage(
        warning,
        "Please review this medicine before continuing.",
      ),
    ),
    errors: result.errors.map((error) =>
      sanitizeUserFacingMessage(
        error,
        "Please review this medicine before continuing.",
      ),
    ),
  };
}

async function postMedicationValidation<T>(
  endpoint: string,
  payload: unknown,
  fallbackMessage: string,
  sanitizeResult?: (result: T) => T,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = (await response
      .json()
      .catch(() => ({}))) as ApiErrorResponse;
    const errorMessage = Array.isArray(errorBody.message)
      ? errorBody.message.join(", ")
      : errorBody.message;
    throw new Error(
      getUserFacingErrorMessage(errorMessage, {
        fallback: fallbackMessage,
        context: "form",
      }),
    );
  }

  const result = (await response.json()) as T;
  return sanitizeResult ? sanitizeResult(result) : result;
}

export function validateMedicationDosage(payload: {
  medication: string;
  dosage: string;
}) {
  return postMedicationValidation<ValidationResult>(
    "/api/medications/validate-dosage",
    payload,
    "We could not check this dosage. Please try again.",
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
  return postMedicationValidation<ContraindicationResult[]>(
    "/api/medications/check-contraindications",
    payload,
    "We could not review this medicine right now. Please try again.",
    (results) => results.map(sanitizeContraindicationResult),
  );
}

export function checkMedicationInteractions(payload: {
  medications: Array<{ name: string; dosage?: string }>;
  patientAllergies?: string[];
}) {
  return postMedicationValidation<unknown>(
    "/api/medications/check-interactions",
    payload,
    "We could not review these medicine interactions. Please try again.",
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
  return postMedicationValidation<ComprehensiveCheckResult>(
    "/api/medications/comprehensive-check",
    payload,
    "We could not complete this medicine review. Please try again.",
    sanitizeComprehensiveCheckResult,
  );
}
