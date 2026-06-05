import type { InternalTierPricingRow } from "@workspace/data-access/internal";

export interface EditableTierRow extends InternalTierPricingRow {
  isDirty?: boolean;
}

export interface PricingOfferFormState {
  clinicId: string;
  title: string;
  description: string;
  percentOff: number;
  durationMonths: number;
  validUntil: string;
  notes: string;
}

export interface OfferTemplate {
  key: string;
  label: string;
  title: string;
  description: string;
  percentOff: number;
  durationMonths: number;
  notes: string;
}

export const DEFAULT_OFFER_FORM: PricingOfferFormState = {
  clinicId: "",
  title: "",
  description: "",
  percentOff: 100,
  durationMonths: 3,
  validUntil: "",
  notes: "",
};

export const OFFER_TEMPLATES: OfferTemplate[] = [
  {
    key: "three_months_free",
    label: "3 months free",
    title: "3 months free with weekly feedback",
    description:
      "Offer 100% discount for the first three months in exchange for weekly feedback and onboarding calls",
    percentOff: 100,
    durationMonths: 3,
    notes:
      "Founders asked for hands-on onboarding. Keep the weekly feedback cadence.",
  },
  {
    key: "half_year_discount",
    label: "50% for 6 months",
    title: "Half-price launch offer",
    description:
      "Reduce the first six months by 50% to close a skeptical clinic quickly",
    percentOff: 50,
    durationMonths: 6,
    notes: "Good for tier 2/3 city clinics that need a softer entry point",
  },
  {
    key: "annual_soft_launch",
    label: "25% annual",
    title: "Annual soft-launch discount",
    description:
      "Use this for annual commitment deals where payment is collected upfront",
    percentOff: 25,
    durationMonths: 12,
    notes:
      "Best when the clinic is ready to commit and needs an intro discount",
  },
];

export function clinicToOption(
  clinic: { id: string; name: string },
): { id: string; name: string } {
  return { id: clinic.id, name: clinic.name };
}

export function findClinicName(
  clinicId: string,
  options: { id: string; name: string }[],
): string {
  return options.find((o) => o.id === clinicId)?.name ?? clinicId;
}

export function buildPageStatus(
  loading: boolean,
  error: unknown,
): "loading" | "error" | "success" {
  if (loading) return "loading";
  if (error) return "error";
  return "success";
}

export const PRICING_LOAD_ERROR_FALLBACK = "We could not load pricing data. Please try again.";
