import {
  TIER_LIMITS,
  TIER_INFO,
  PRICING_CURRENCY_CONFIG,
  getWhatsAppAddonPricingByCurrency,
  type SupportedCurrency,
} from '@workspace/types';

export function resolveCurrency(
  supportedCurrencies: SupportedCurrency[],
  currency?: string,
): SupportedCurrency {
  const selectedCurrency = currency?.toUpperCase() as
    | SupportedCurrency
    | undefined;
  if (selectedCurrency && supportedCurrencies.includes(selectedCurrency)) {
    return selectedCurrency;
  }

  return supportedCurrencies[0];
}

export function parseJsonValue(value: unknown): unknown {
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

export function parseStringArray(value: unknown): string[] {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(
    (item): item is string => typeof item === 'string' && item.length > 0,
  );
}

export function getWhatsappBillableConfig(
  tier: keyof typeof TIER_LIMITS,
  currency: SupportedCurrency,
): { includedQuota: number; overageRate: number } {
  if (
    tier === 'ESSENTIAL' ||
    tier === 'FRONT_DESK' ||
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
