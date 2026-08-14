import {
  TIER_LIMITS,
  TIER_INFO,
  PRICING_CURRENCY_CONFIG,
  tierPricingFeaturesJsonSchema,
  tierSchema,
  type SupportedCurrency,
  type TierName,
} from '@workspace/types';
import { getWhatsAppAddonPricingByCurrency } from '@workspace/utils';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';

export const SUPPORTED_PRICING_CURRENCIES: SupportedCurrency[] = [
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AUD',
  'CAD',
  'SGD',
  'AED',
  'ZAR',
];

function isTierLimitsKey(value: string): value is keyof typeof TIER_LIMITS {
  return Object.prototype.hasOwnProperty.call(TIER_LIMITS, value);
}

/** Maps DB tier strings to canonical pricing tier keys. */
export function mapDbTierStringToCanonicalTier(
  dbTier: string,
): keyof typeof TIER_LIMITS {
  const parsed = tierSchema.safeParse(dbTier);
  if (parsed.success && isTierLimitsKey(parsed.data)) {
    return parsed.data;
  }
  const upper = dbTier.toUpperCase();
  if (isTierLimitsKey(upper)) {
    return upper;
  }
  return 'STARTER';
}

/** Maps user-facing tier input to a {@link TierName} pricing key. */
export function mapPricingTierInputToTierName(tier: string): TierName | null {
  const canonical = mapDbTierStringToCanonicalTier(tier.toUpperCase());
  if (canonical === 'INTELLIGENCE') return null;
  const parsed = tierSchema.safeParse(canonical);
  return parsed.success ? parsed.data : null;
}

function isSupportedCurrency(
  value: string,
  supportedCurrencies: readonly SupportedCurrency[],
): value is SupportedCurrency {
  return supportedCurrencies.some((currency) => currency === value);
}

export function resolveCurrency(
  supportedCurrencies: readonly SupportedCurrency[],
  currency?: string,
): SupportedCurrency {
  const selectedCurrency = currency?.toUpperCase();
  if (
    selectedCurrency &&
    isSupportedCurrency(selectedCurrency, supportedCurrencies)
  ) {
    return selectedCurrency;
  }

  return supportedCurrencies[0] ?? 'INR';
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  return value;
}

export function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseStringArray(value: unknown): string[] {
  const normalized = parseJsonValue(value);
  const parsed = parsePrismaJsonColumn(
    normalized,
    tierPricingFeaturesJsonSchema,
  );
  if (!parsed) return [];

  return parsed.filter((item) => item.length > 0);
}

export function getWhatsappBillableConfig(
  tier: keyof typeof TIER_LIMITS,
  currency: SupportedCurrency,
): { includedQuota: number; overageRate: number } {
  if (
    tier === 'ESSENTIAL' ||
    tier === 'PROFESSIONAL' ||
    tier === 'ENTERPRISE'
  ) {
    const pricing = getWhatsAppAddonPricingByCurrency(tier, currency);
    return {
      includedQuota: pricing.includedQuota,
      overageRate: pricing.overageRate,
    };
  }
  return { includedQuota: 0, overageRate: 0 };
}

export function toPricingTierPayload(args: {
  tier: keyof typeof TIER_LIMITS;
  validCurrency: SupportedCurrency;
  monthly: number | 'custom';
  yearly: number | 'custom';
  includedAppointments: number;
  includedUsers: number;
  features: unknown;
}) {
  const {
    tier,
    validCurrency,
    monthly,
    yearly,
    includedAppointments,
    includedUsers,
    features,
  } = args;
  const tierDefaults = TIER_LIMITS[tier];
  const whatsapp = getWhatsappBillableConfig(tier, validCurrency);

  return {
    id: tier,
    name: TIER_INFO[tier].name,
    description: TIER_INFO[tier].description,
    tagline: TIER_INFO[tier].tagline,
    color: TIER_INFO[tier].color,
    pricing: {
      monthly,
      yearly,
      currency: PRICING_CURRENCY_CONFIG[validCurrency].symbol,
    },
    limits: {
      patients: tierDefaults.patients,
      appointments: includedAppointments,
      storage: tierDefaults.storageGB,
      users: includedUsers,
      doctors: tierDefaults.doctors,
      branches: tierDefaults.branches,
      prescriptions: tierDefaults.prescriptions,
      invoices: tierDefaults.invoices,
      billable: {
        consultations: includedAppointments,
        users: includedUsers,
        whatsappMessages: whatsapp.includedQuota,
      },
    },
    features: parseStringArray(features),
  };
}
