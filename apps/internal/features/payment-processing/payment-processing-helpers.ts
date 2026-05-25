import {
  GUIDED_SETUP_LIST_PRICE_BY_CURRENCY,
  mapDbClinicTierStringToTierName,
} from "@workspace/types";
import {
  DEFAULT_CURRENCY,
  parseSupportedCurrency,
} from "@workspace/utils";
import type { InternalClinicTierInfo, InternalPaymentTierPricingRow } from "@workspace/data-access/internal";
import { buildDefaultInternalTierPricingRows } from "@/lib/tier-display";

export type PaymentClinic = {
  id: string;
  name: string;
  tier: string;
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
