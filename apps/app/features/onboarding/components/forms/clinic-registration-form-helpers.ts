import { z } from "zod";
import { DEFAULT_COUNTRY_CODE, isRecord } from "@workspace/utils";
import type { ClinicDetails } from "@/features/onboarding/components/types";
import { clinicDetailsSchema } from "@/features/onboarding/schemas/clinic-details-refinement";

export const STEPS = [
  { number: 1, label: "Facility Details", estimatedTime: "2 min" },
  { number: 2, label: "Visit hours", estimatedTime: "2 min" },
  { number: 3, label: "Invite Team", estimatedTime: "2 min" },
  { number: 4, label: "Choose Plan", estimatedTime: "3 min" },
  { number: 5, label: "Compliance", estimatedTime: "3 min" },
];

export const TOTAL_STEPS = 5;
export const DRAFT_KEY = "docita_onboarding_draft";
export const SESSION_ONBOARDING_ID_KEY = "docita_onboarding_id";

export interface OnboardingDraft {
  clinicDetails: Partial<ClinicDetails>;
  savedAt: string;
  onboardingId?: string | null;
}

const onboardingDraftEnvelopeSchema = z.object({
  clinicDetails: z.unknown().optional(),
  savedAt: z.string(),
  onboardingId: z.string().nullable().optional(),
});

function toPartialClinicDetails(value: unknown): Partial<ClinicDetails> {
  const validated = parseClinicDetailsDraft(value);
  if (validated) return validated;
  return isRecord(value) ? value : {};
}

export function parseOnboardingDraft(raw: unknown): OnboardingDraft | null {
  const parsed = onboardingDraftEnvelopeSchema.safeParse(raw);
  if (!parsed.success) return null;
  return {
    clinicDetails: toPartialClinicDetails(parsed.data.clinicDetails),
    savedAt: parsed.data.savedAt,
    onboardingId: parsed.data.onboardingId,
  };
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
