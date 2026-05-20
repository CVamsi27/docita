export interface BillingTierInfo {
  name: string;
  price: number | null;
  maxDoctors: number;
  aiEnabled: boolean;
}

const TIER_DETAILS: Record<string, BillingTierInfo> = {
  CAPTURE: { name: 'Capture', price: 0, maxDoctors: 1, aiEnabled: false },
  CORE: { name: 'Core', price: 4999, maxDoctors: 5, aiEnabled: false },
  PLUS: { name: 'Plus', price: 9999, maxDoctors: 20, aiEnabled: false },
  PRO: { name: 'Pro', price: 24999, maxDoctors: -1, aiEnabled: true },
  CLINIC: { name: 'Clinic', price: 49999, maxDoctors: -1, aiEnabled: true },
  ENTERPRISE: {
    name: 'Enterprise',
    price: null,
    maxDoctors: -1,
    aiEnabled: true,
  },
};

export const INTERNAL_BILLING_TIER_ORDER = [
  'CAPTURE',
  'CORE',
  'PLUS',
  'PRO',
  'CLINIC',
  'ENTERPRISE',
] as const;

export function getBillingTierDetails(tier: string): BillingTierInfo | null {
  return TIER_DETAILS[tier] ?? null;
}
