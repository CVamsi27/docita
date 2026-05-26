import {
  getUserFacingErrorMessage,
  isRecord,
  sanitizeUserFacingMessage,
} from "@workspace/types";
import { browserRequest } from "@/lib/auth/browser-request";

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

function sanitizeValidationResult(result: ValidationResult): ValidationResult {
  return {
    ...result,
    message: result.message
      ? sanitizeUserFacingMessage(
          result.message,
          "Please review this dosage before continuing",
        )
      : undefined,
    suggestion: result.suggestion
      ? sanitizeUserFacingMessage(
          result.suggestion,
          "Please review this dosage before continuing",
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
      "Please review this medicine before continuing",
    ),
    recommendation: sanitizeUserFacingMessage(
      result.recommendation,
      "Please review this medicine before continuing",
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
        "Please review this medicine before continuing",
      ),
    ),
    errors: result.errors.map((error) =>
      sanitizeUserFacingMessage(
        error,
        "Please review this medicine before continuing",
      ),
    ),
  };
}

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

function parseValidationResult(result: unknown): ValidationResult {
  if (!isRecord(result) || typeof result.isValid !== "boolean") {
    throw new Error("We could not check this dosage. Please try again.");
  }
  return {
    isValid: result.isValid,
    message: typeof result.message === "string" ? result.message : undefined,
    severity:
      result.severity === "warning" || result.severity === "critical"
        ? result.severity
        : undefined,
    suggestion:
      typeof result.suggestion === "string" ? result.suggestion : undefined,
  };
}

function parseContraindicationResults(result: unknown): ContraindicationResult[] {
  if (!Array.isArray(result)) {
    throw new Error("We could not review this medicine right now. Please try again.");
  }
  return result.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.isContraindicated !== "boolean" ||
      typeof entry.message !== "string" ||
      typeof entry.recommendation !== "string"
    ) {
      throw new Error("We could not review this medicine right now. Please try again.");
    }
    const severity = entry.severity;
    if (severity !== "info" && severity !== "warning" && severity !== "critical") {
      throw new Error("We could not review this medicine right now. Please try again.");
    }
    return {
      isContraindicated: entry.isContraindicated,
      severity,
      message: entry.message,
      recommendation: entry.recommendation,
      alternatives: Array.isArray(entry.alternatives)
        ? entry.alternatives.filter((item): item is string => typeof item === "string")
        : undefined,
    };
  });
}

function parseComprehensiveCheckResult(result: unknown): ComprehensiveCheckResult {
  if (!isRecord(result)) {
    throw new Error("We could not complete this medicine review. Please try again.");
  }
  const dosageValidations = Array.isArray(result.dosageValidations)
    ? result.dosageValidations.map(parseValidationResult)
    : [];
  const contraindications = Array.isArray(result.contraindications)
    ? parseContraindicationResults(result.contraindications)
    : [];
  const warnings = Array.isArray(result.warnings)
    ? result.warnings.filter((w): w is string => typeof w === "string")
    : [];
  const errors = Array.isArray(result.errors)
    ? result.errors.filter((e): e is string => typeof e === "string")
    : [];
  const summary = isRecord(result.summary) ? result.summary : {};
  return {
    dosageValidations,
    contraindications,
    warnings,
    errors,
    isApproved: result.isApproved === true,
    requiresReview: result.requiresReview === true,
    summary: {
      totalMedications:
        typeof summary.totalMedications === "number" ? summary.totalMedications : 0,
      validMedications:
        typeof summary.validMedications === "number" ? summary.validMedications : 0,
      warnings: typeof summary.warnings === "number" ? summary.warnings : 0,
      errors: typeof summary.errors === "number" ? summary.errors : 0,
    },
  };
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
