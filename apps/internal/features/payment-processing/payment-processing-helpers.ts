import { QueryClient } from "@tanstack/react-query";
import {
  GUIDED_SETUP_LIST_PRICE_BY_CURRENCY,
  mapDbClinicTierStringToTierName,
  recordInternalAdditionalChargeRequestSchema,
  type TierName,
} from "@workspace/types";
import {
  DEFAULT_CURRENCY,
  parseSupportedCurrency,
} from "@workspace/utils";
import type { DataAccessConfig } from "@workspace/data-access";
import {
  fetchInternalClinicTierInfo,
  fetchInternalPricingConfig,
  type InternalClinicTierInfo,
  type InternalPaymentTierPricingRow,
} from "@workspace/data-access/internal";
import { buildDefaultInternalTierPricingRows } from "@/lib/tier-display";
import { internalQueryKeys } from "@/lib/api/query-keys";
import type { DataStateStatus } from "@workspace/ui/components/data-display/data-state";

export type PaymentClinic = {
  id: string;
  name: string;
  tier: TierName;
  email: string;
  phone: string;
  currency?: string;
};

export type PaymentTierInfo = InternalClinicTierInfo;
export type PaymentTierPricing = InternalPaymentTierPricingRow;

export interface PaymentFormData {
  paymentMethod: string;
  amount: string;
  newTier: string;
  paymentNotes?: string;
}

export interface PricingOfferFormData {
  clinicId: string;
  percentOff: string;
  title: string;
  validUntil: string;
  notes: string;
}

export interface AdditionalChargeFormData {
  category: string;
  amount: string;
  paymentMethod: string;
  razorpayPaymentId: string;
  notes: string;
}

export function guidedSetupPresetAmount(currency: string | undefined): string {
  const key = (currency ?? DEFAULT_CURRENCY).toUpperCase();
  if (
    Object.prototype.hasOwnProperty.call(
      GUIDED_SETUP_LIST_PRICE_BY_CURRENCY,
      key,
    )
  ) {
    return String(
      GUIDED_SETUP_LIST_PRICE_BY_CURRENCY[parseSupportedCurrency(key)],
    );
  }
  return "";
}

export const DEFAULT_PAYMENT_TIER_PRICING =
  buildDefaultInternalTierPricingRows();

export function mapClinicsForPayment(
  clinics: Array<{
    id: string;
    name: string;
    tier?: string | null;
    email?: string | null;
    phone?: string | null;
    currency?: string;
  }>,
): PaymentClinic[] {
  return clinics.map((clinic) => ({
    id: clinic.id,
    name: clinic.name,
    tier: mapDbClinicTierStringToTierName(clinic.tier ?? "STARTER"),
    email: clinic.email ?? "",
    phone: clinic.phone ?? "",
    currency: clinic.currency,
  }));
}

export const PAYMENT_FORM_DEFAULTS: PaymentFormData = {
  paymentMethod: "razorpay",
  amount: "",
  newTier: "",
  paymentNotes: "",
};

export const ADDITIONAL_CHARGE_FORM_DEFAULTS: AdditionalChargeFormData = {
  category: "GUIDED_SETUP",
  amount: "",
  paymentMethod: "manual",
  razorpayPaymentId: "",
  notes: "",
};

export const PRICING_OFFER_FORM_DEFAULTS: PricingOfferFormData = {
  clinicId: "",
  percentOff: "10",
  title: "Commercial discount",
  validUntil: "",
  notes: "",
};

export function mapPricingDataToTierPricing(
  pricingData: { tiers?: Array<{ id: string; pricing?: { monthly?: number } }> },
): PaymentTierPricing[] {
  return Array.isArray(pricingData.tiers)
    ? pricingData.tiers.map((tier) => ({
        tier: tier.id,
        price: typeof tier.pricing?.monthly === "number" ? tier.pricing.monthly : 0,
        billingCycle: "monthly",
        maxDoctors: -1,
        maxPatients: -1,
        features: [],
      }))
    : [];
}

export function buildPaymentRequestPayload(
  clinic: PaymentClinic | null,
  data: PaymentFormData,
) {
  return {
    paymentId: `PAY_${Date.now()}`,
    amount: parseFloat(data.amount),
    currency: clinic?.currency || DEFAULT_CURRENCY,
    newTier: data.newTier,
    paymentMethod: data.paymentMethod,
    notes: data.paymentNotes,
  };
}

export function buildPricingOfferPayload(data: PricingOfferFormData) {
  return {
    clinicId: data.clinicId,
    title: data.title.trim() || "Commercial discount",
    percentOff: Number.parseFloat(data.percentOff),
    validUntil: data.validUntil.trim() || undefined,
    notes: data.notes.trim() || undefined,
  };
}

export function extractAdditionalChargeError(
  fieldErrors: Record<string, string[]>,
): string {
  return (
    fieldErrors.amount?.[0] ??
    fieldErrors.category?.[0] ??
    fieldErrors.paymentMethod?.[0] ??
    "Check the form and try again."
  );
}

export function validatePricingOfferParams(
  percent: number,
  clinicId: string,
): string | null {
  if (!Number.isFinite(percent) || percent < 0 || percent > 95) {
    return "Percent off must be a number between 0 and 95.";
  }
  if (!clinicId) {
    return "Select a facility.";
  }
  return null;
}

export function buildAdditionalChargeRequestPayload(
  raw: AdditionalChargeFormData,
  currency: string,
) {
  return {
    category: raw.category,
    paymentMethod: raw.paymentMethod,
    amount: Number.parseFloat(raw.amount),
    currency,
    razorpayPaymentId: raw.razorpayPaymentId.trim() || undefined,
    notes: raw.notes.trim() || undefined,
  };
}

// --- Error message constants extracted from the hook ---

export const LOAD_PLAN_DETAILS_ERROR = "We could not load these plan details. Please try again.";
export const PROCESS_PAYMENT_ERROR = "We could not process this payment. Please try again.";
export const RECORD_CHARGE_ERROR = "We could not record this charge. Please try again.";
export const SAVE_DISCOUNT_ERROR = "We could not save this checkout discount. Please try again.";

// --- Fetch and form helpers extracted from the hook ---

export async function fetchClinicTierData(
  qc: QueryClient,
  fetcher: DataAccessConfig["fetcher"],
  clinic: { id: string; currency?: string },
) {
  const data = await qc.fetchQuery({
    queryKey: internalQueryKeys.internal.clinicTierInfo(clinic.id),
    queryFn: () => fetchInternalClinicTierInfo(fetcher, clinic.id),
  });
  const pricingData = await qc.fetchQuery({
    queryKey: internalQueryKeys.internal.pricingConfig(clinic.currency || DEFAULT_CURRENCY),
    queryFn: () => fetchInternalPricingConfig(fetcher, clinic.currency || DEFAULT_CURRENCY),
  });
  return { data, pricingData };
}

export function parseAdditionalChargeForm(
  raw: AdditionalChargeFormData,
  currency: string | undefined,
): { success: true; data: Record<string, unknown> } | { success: false; error: string } {
  const parsed = recordInternalAdditionalChargeRequestSchema.safeParse({
    category: raw.category,
    paymentMethod: raw.paymentMethod,
    amount: Number.parseFloat(raw.amount),
    currency: currency || DEFAULT_CURRENCY,
    razorpayPaymentId: raw.razorpayPaymentId.trim() || undefined,
    notes: raw.notes.trim() || undefined,
  });
  if (!parsed.success) {
    return { success: false, error: extractAdditionalChargeError(parsed.error.flatten().fieldErrors) };
  }
  return { success: true, data: parsed.data };
}

export function derivePaymentPageStatus(
  isLoading: boolean,
  clinicsLoading: boolean,
  tierPricingLoading: boolean,
): DataStateStatus {
  return isLoading || clinicsLoading || tierPricingLoading ? "loading" : "success";
}

export function buildAdditionalChargeDefaults(clinic: { currency?: string }): AdditionalChargeFormData {
  return { ...ADDITIONAL_CHARGE_FORM_DEFAULTS, amount: guidedSetupPresetAmount(clinic.currency) };
}
