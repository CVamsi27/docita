/**
 * Pure session-storage helpers for the clinic registration flow.
 * No React, no hooks — just read/write/clear helpers.
 */
import { z } from "zod";
import { DEFAULT_COUNTRY_CODE, isRecord } from "@workspace/utils";
import { ApiError } from "@/lib/errors";
import { parseClinicDetailsDraft } from "@/features/onboarding/components/forms/clinic-registration-form-helpers";
import {
  type ClinicRegistrationData,
  defaultClinicRegistrationData,
} from "@/features/onboarding/components/types";
import { clinicRegistrationSessionSchema } from "@/features/onboarding/hooks/onboarding-session-schemas";
import { complianceSchema } from "@/features/onboarding/components/types";

export const SESSION_KEY = "docita_onboarding_step";
export const SESSION_ONBOARDING_ID_KEY = "docita_onboarding_id";
export const SESSION_FORM_DATA_KEY = "docita_onboarding_form_data";

export const RESTARTABLE_ONBOARDING_ERROR =
  /onboarding session not found|expired|validation|missing required/i;

interface RestartableOnboardingError extends Error {
  restartOnboarding?: boolean;
}

function hasRestartOnboardingFlag(
  error: unknown,
): error is RestartableOnboardingError {
  return (
    typeof error === "object" &&
    error !== null &&
    "restartOnboarding" in error &&
    error.restartOnboarding === true
  );
}

export function isRestartableOnboardingError(error: unknown): boolean {
  if (hasRestartOnboardingFlag(error)) {
    return true;
  }
  if (error instanceof ApiError) {
    return error.statusCode === 400 || error.statusCode === 404;
  }
  const rawMessage =
    error instanceof Error ? error.message : String(error ?? "");
  return RESTARTABLE_ONBOARDING_ERROR.test(rawMessage);
}

export function getPersistedStep(): number {
  if (typeof sessionStorage === "undefined") return 1;
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    const n = v ? parseInt(v, 10) : 1;
    const clamped = isNaN(n) ? 1 : Math.max(1, Math.min(n, 5));
    const persistedOnboardingId = sessionStorage.getItem(SESSION_ONBOARDING_ID_KEY);
    // Step 5 (compliance) requires an onboarding session ID (used for QR signature flow).
    // If an older/stale session has step 5 but no ID, recover to step 4.
    if (clamped >= 5 && !persistedOnboardingId) return 4;
    return clamped;
  } catch {
    return 1;
  }
}

const persistedFormEnvelopeSchema = z.object({
  clinicDetails: z.unknown().optional(),
  compliance: z.unknown().optional(),
  planSelection: z.unknown().optional(),
  paymentDetails: z.unknown().optional(),
  teamMembers: z.array(z.unknown()).optional(),
  clinicWeeklyHours: z.array(z.unknown()).optional(),
});

function parsePersistedFormData(raw: unknown): ClinicRegistrationData {
  const envelope = persistedFormEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    return defaultClinicRegistrationData;
  }

  const clinicDetails = parseClinicDetailsDraft(envelope.data.clinicDetails);
  const fallbackClinicDetails = isRecord(envelope.data.clinicDetails)
    ? {
        facilityLabel: "CLINIC",
        countryCode: DEFAULT_COUNTRY_CODE,
        ...envelope.data.clinicDetails,
      }
    : defaultClinicRegistrationData.clinicDetails;
  const compliance = complianceSchema
    .partial()
    .safeParse(envelope.data.compliance);

  const candidate = {
    ...defaultClinicRegistrationData,
    clinicDetails: clinicDetails
      ? { ...defaultClinicRegistrationData.clinicDetails, ...clinicDetails }
      : fallbackClinicDetails,
    compliance: compliance.success
      ? { ...defaultClinicRegistrationData.compliance, ...compliance.data }
      : defaultClinicRegistrationData.compliance,
    planSelection: isRecord(envelope.data.planSelection)
      ? {
          ...defaultClinicRegistrationData.planSelection,
          ...envelope.data.planSelection,
        }
      : defaultClinicRegistrationData.planSelection,
    paymentDetails: isRecord(envelope.data.paymentDetails)
      ? {
          ...defaultClinicRegistrationData.paymentDetails,
          ...envelope.data.paymentDetails,
        }
      : defaultClinicRegistrationData.paymentDetails,
    teamMembers: Array.isArray(envelope.data.teamMembers)
      ? envelope.data.teamMembers
      : defaultClinicRegistrationData.teamMembers,
    clinicWeeklyHours: Array.isArray(envelope.data.clinicWeeklyHours)
      ? envelope.data.clinicWeeklyHours
      : defaultClinicRegistrationData.clinicWeeklyHours,
  };

  const parsed = clinicRegistrationSessionSchema.safeParse(candidate);
  return parsed.success ? parsed.data : defaultClinicRegistrationData;
}

export function getPersistedOnboardingId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(SESSION_ONBOARDING_ID_KEY);
  } catch {
    return null;
  }
}

export function getPersistedFormData(): ClinicRegistrationData {
  if (typeof sessionStorage === "undefined") return defaultClinicRegistrationData;
  try {
    const raw = sessionStorage.getItem(SESSION_FORM_DATA_KEY);
    if (!raw) return defaultClinicRegistrationData;
    return parsePersistedFormData(JSON.parse(raw));
  } catch {
    return defaultClinicRegistrationData;
  }
}

export function clearOnboardingSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_ONBOARDING_ID_KEY);
    sessionStorage.removeItem(SESSION_FORM_DATA_KEY);
  } catch {
    /* ignore */
  }
}

export function persistStep(n: number): void {
  try {
    sessionStorage.setItem(SESSION_KEY, String(n));
  } catch {
    /* ignore */
  }
}

export function persistOnboardingId(id: string | null): void {
  try {
    if (id) sessionStorage.setItem(SESSION_ONBOARDING_ID_KEY, id);
    else sessionStorage.removeItem(SESSION_ONBOARDING_ID_KEY);
  } catch {
    /* ignore */
  }
}

export function persistFormData(data: ClinicRegistrationData): void {
  try {
    sessionStorage.setItem(SESSION_FORM_DATA_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}
