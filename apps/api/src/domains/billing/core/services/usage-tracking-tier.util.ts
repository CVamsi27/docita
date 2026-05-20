import { ClinicTier } from '@workspace/db';
import {
  PRICING_CURRENCY_CONFIG,
  tierSchema,
  type SupportedCurrency,
  type TierName,
} from '@workspace/types';
import { DEFAULT_CURRENCY } from '@workspace/utils';
import { validateClinicTier } from '@/domains/clinics/application/services/onboarding/type-helpers';

export type UsageWarningThreshold = 80 | 100 | null;

function isSupportedCurrency(value: string): value is SupportedCurrency {
  return Object.prototype.hasOwnProperty.call(PRICING_CURRENCY_CONFIG, value);
}

export function resolveSupportedCurrency(currency?: string): SupportedCurrency {
  const selected = currency?.toUpperCase();
  if (selected && isSupportedCurrency(selected)) {
    return selected;
  }

  const fallback = DEFAULT_CURRENCY.toUpperCase();
  if (isSupportedCurrency(fallback)) {
    return fallback;
  }

  return 'INR';
}

export function resolveTierName(plan: string | undefined): TierName {
  const parsed = tierSchema.safeParse(plan);
  return parsed.success ? parsed.data : 'STARTER';
}

export function resolveClinicTierPlan(
  plan: string | undefined,
): ClinicTier {
  return validateClinicTier(plan);
}

export function buildUsageWarning(
  current: number,
  included: number,
): { percentUsed: number; threshold: UsageWarningThreshold } {
  if (included <= 0) {
    return { percentUsed: 0, threshold: null };
  }

  const percentUsed = (current / included) * 100;
  if (percentUsed >= 100) {
    return { percentUsed, threshold: 100 };
  }
  if (percentUsed >= 80) {
    return { percentUsed, threshold: 80 };
  }
  return { percentUsed, threshold: null };
}
