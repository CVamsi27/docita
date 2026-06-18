interface BillingTierInfo {
  name: string;
  price: number | null;
  maxDoctors: number;
  aiEnabled: boolean;
}

/**
 * Canonical tier details keyed by the published plan ladder names.
 * Legacy DB values (CAPTURE, CORE, PLUS, PRO, CLINIC) were removed in
 * migration 20260323000000 and no longer appear in the database.
 */
const TIER_DETAILS: Record<string, BillingTierInfo> = {
  STARTER: { name: 'Starter', price: 0, maxDoctors: 1, aiEnabled: false },
  ESSENTIAL: {
    name: 'Essential',
    price: 4999,
    maxDoctors: 1,
    aiEnabled: false,
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 24999,
    maxDoctors: 5,
    aiEnabled: true,
  },
  HOSPITAL: {
    name: 'Hospital',
    price: 49999,
    maxDoctors: 25,
    aiEnabled: true,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: null,
    maxDoctors: -1,
    aiEnabled: true,
  },
};

/** Published plan ladder order (canonical tier names only). */
export const INTERNAL_BILLING_TIER_ORDER = [
  'STARTER',
  'ESSENTIAL',
  'PROFESSIONAL',
  'HOSPITAL',
  'ENTERPRISE',
] as const;

export function getBillingTierDetails(tier: string): BillingTierInfo | null {
  return TIER_DETAILS[tier] ?? null;
}
