import { z } from "zod";
import { DEFAULT_COUNTRY_CODE, getUserFacingErrorMessage, isRecord, type UserFacingErrorContext } from "@workspace/utils";
import type {
  ClinicDetails,
  ClinicRegistrationData,
  ComplianceSettings,
} from "@/features/setup/components/onboarding/types";
import {
  complianceSchema,
  defaultClinicRegistrationData,
} from "@/features/setup/components/onboarding/types";
import { clinicDetailsSchema } from "@/features/setup/schemas/clinic-details-refinement";
import { clinicRegistrationSessionSchema } from "@/features/setup/hooks/onboarding-session-schemas";

export const STEPS = [
  { number: 1, label: "Facility Details", estimatedTime: "2 min" },
  { number: 2, label: "Visit hours", estimatedTime: "2 min" },
  { number: 3, label: "Invite Team", estimatedTime: "2 min" },
  { number: 4, label: "Choose Plan", estimatedTime: "3 min" },
  { number: 5, label: "Compliance", estimatedTime: "3 min" },
];

/** Single source of truth for the onboarding wizard step count. */
export const TOTAL_STEPS = STEPS.length;
export const DRAFT_KEY = "docita_onboarding_draft";
export const SESSION_ONBOARDING_ID_KEY = "docita_onboarding_id";
export const SESSION_KEY = "docita_onboarding_step";

export interface OnboardingDraft {
  clinicDetails: Partial<ClinicDetails>;
  compliance: Partial<ComplianceSettings>;
  /** Full flow snapshot so steps 2–5 keep their data across a fresh session. */
  formData?: ClinicRegistrationData;
  /** Wizard step the user left off on (1–5). */
  step?: number;
  savedAt: string;
  onboardingId?: string | null;
}

const onboardingDraftEnvelopeSchema = z.object({
  clinicDetails: z.unknown().optional(),
  compliance: z.unknown().optional(),
  formData: z.unknown().optional(),
  step: z.number().optional(),
  savedAt: z.string(),
  onboardingId: z.string().nullable().optional(),
});

function toPartialClinicDetails(value: unknown): Partial<ClinicDetails> {
  const validated = parseClinicDetailsDraft(value);
  if (validated) return validated;
  return isRecord(value) ? value : {};
}

function toPartialComplianceSettings(
  value: unknown,
): Partial<ComplianceSettings> {
  const parsed = complianceSchema.partial().safeParse(value);
  return parsed.success ? parsed.data : {};
}

function toFullFormData(value: unknown): ClinicRegistrationData | undefined {
  const parsed = clinicRegistrationSessionSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseOnboardingDraft(raw: unknown): OnboardingDraft | null {
  const parsed = onboardingDraftEnvelopeSchema.safeParse(raw);
  if (!parsed.success) return null;
  return {
    clinicDetails: toPartialClinicDetails(parsed.data.clinicDetails),
    compliance: toPartialComplianceSettings(parsed.data.compliance),
    formData: toFullFormData(parsed.data.formData),
    step: parsed.data.step,
    savedAt: parsed.data.savedAt,
    onboardingId: parsed.data.onboardingId,
  };
}

/**
 * Reconstruct the full flow state to restore. Prefers the complete snapshot
 * saved with the draft; for older/partial drafts that predate snapshot support,
 * merges the field-level clinic details and compliance onto the defaults so the
 * flow still receives clinic details (and StepGuard does not wrongly restart).
 */
export function buildResumeFormData(
  draft: OnboardingDraft,
): ClinicRegistrationData {
  if (draft.formData) return draft.formData;

  // Merge the partial field-level draft onto defaults directly (rather than
  // requiring a fully valid parse) so even incomplete clinic details survive.
  return {
    ...defaultClinicRegistrationData,
    clinicDetails: {
      ...defaultClinicRegistrationData.clinicDetails,
      ...draft.clinicDetails,
    },
    compliance: {
      ...defaultClinicRegistrationData.compliance,
      ...draft.compliance,
    },
  };
}

/**
 * Decide which step to resume on restore. Clamps to 1–5, forces Step 1 when the
 * clinic details required by later steps are missing, and downgrades the
 * compliance step (5) to plan (4) when no onboarding session id is available.
 */
export function resolveResumeStep(draft: OnboardingDraft): number {
  const requested = draft.step ?? 1;
  const clamped = Math.max(1, Math.min(requested, TOTAL_STEPS));
  if (clamped <= 1) return 1;

  const clinicDetails = draft.formData?.clinicDetails ?? draft.clinicDetails;
  if (getMissingClinicDetailsForProgress(clinicDetails).length > 0) return 1;

  if (clamped >= 5 && !draft.onboardingId) return 4;
  return clamped;
}

export function parseClinicDetailsDraft(value: unknown): ClinicDetails | null {
  const candidate = isRecord(value)
    ? {
        facilityLabel: "CLINIC",
        countryCode: DEFAULT_COUNTRY_CODE,
        ...value,
      }
    : value;
  const parsed = clinicDetailsSchema.safeParse(candidate ?? {});
  return parsed.success ? parsed.data : null;
}

export function hasMeaningfulClinicDraftData(
  clinicDetails: Partial<ClinicDetails> | undefined,
): boolean {
  if (!clinicDetails) return false;

  const meaningfulStringFields: Array<keyof ClinicDetails> = [
    "name",
    "email",
    "phone",
    "address",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "pincode",
    "website",
    "gstin",
    "legalName",
  ];

  const hasMeaningfulString = meaningfulStringFields.some((field) => {
    const value = clinicDetails[field];
    return typeof value === "string" && value.trim().length > 0;
  });

  return hasMeaningfulString || Boolean(clinicDetails.type);
}

export function hasMeaningfulComplianceDraftData(
  compliance: Partial<ComplianceSettings> | undefined,
): boolean {
  if (!compliance) return false;
  return (
    compliance.acceptedSLA === true ||
    compliance.acceptedPrivacyPolicy === true ||
    compliance.acceptedDataProcessing === true ||
    compliance.enableWhatsApp === true ||
    compliance.requireConsent === false ||
    Boolean(compliance.slaSignatureSessionId?.trim())
  );
}

export function getMissingClinicDetailsForProgress(
  clinicDetails: Partial<ClinicDetails> | undefined,
): string[] {
  const missing: string[] = [];
  if (!clinicDetails?.name?.trim()) missing.push("facility name");
  if (!clinicDetails?.phone?.trim()) missing.push("facility phone");
  if (!clinicDetails?.address?.trim()) missing.push("facility address");
  if (!clinicDetails?.type) missing.push("facility type");
  return missing;
}

export async function withStepErrorHandling<T>(
  action: () => Promise<T>,
  setStepError: (error: string | null) => void,
  fallback: string,
  context: UserFacingErrorContext,
): Promise<T | undefined> {
  setStepError(null);
  try {
    return await action();
  } catch (error) {
    setStepError(
      getUserFacingErrorMessage(error, { fallback, context }),
    );
  }
}
