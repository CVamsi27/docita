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

async function postMedicationValidation<T>(
  endpoint: string,
  payload: unknown,
  fallbackMessage: string,
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
    throw new Error(errorMessage || fallbackMessage);
  }

  return (await response.json()) as T;
}

export function validateMedicationDosage(payload: {
  medication: string;
  dosage: string;
}) {
  return postMedicationValidation<ValidationResult>(
    "/api/medications/validate-dosage",
    payload,
    "Dosage validation failed",
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
    "Contraindication check failed",
  );
}

export function checkMedicationInteractions(payload: {
  medications: Array<{ name: string; dosage?: string }>;
  patientAllergies?: string[];
}) {
  return postMedicationValidation<unknown>(
    "/api/medications/check-interactions",
    payload,
    "Interaction check failed",
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
    "Comprehensive check failed",
  );
}
