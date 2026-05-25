export interface InternalPaymentClinic {
  id: string;
  name: string;
  tier: string;
  email: string;
  phone: string;
  currency?: string;
}

export interface InternalClinicTierInfo {
  currentTier: string;
  maxDoctors: number;
  maxPatients: number;
  features: string[];
  pricing: number;
}

/** Tier row from `/internal/tier-pricing` (payment-processing defaults). */
export interface InternalPaymentTierPricingRow {
  tier: string;
  displayName?: string;
  price: number;
  priceIsCustom?: boolean;
  billingCycle: string;
  maxDoctors: number;
  maxPatients: number;
  features: string[];
}

export interface InternalPricingOfferRow {
  id: string;
  clinicId: string;
  clinic?: {
    id: string;
    name: string;
    email: string;
    tier: string;
  };
  title: string;
  description: string;
  percentOff: number;
  durationMonths?: number;
  validUntil?: string;
  notes?: string;
  updatedAt?: string;
}
