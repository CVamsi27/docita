import { isRecord, sanitizeUserFacingMessage } from "@workspace/utils";

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
    if (severity !== "info" && severity !== "warning" && severity !== "critical") throw new Error("We could not review this medicine right now. Please try again.");
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

export {
  sanitizeValidationResult,
  sanitizeContraindicationResult,
  sanitizeComprehensiveCheckResult,
  parseValidationResult,
  parseContraindicationResults,
  parseComprehensiveCheckResult,
};
