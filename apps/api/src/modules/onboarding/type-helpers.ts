// Onboarding type helpers

import { Specialization, ClinicTier, BillingCycle } from '@workspace/db';

/**
 * Safely validate and convert a string to Specialization enum or null
 */
export function validateSpecializationForOnboarding(
  value: string | null | undefined,
): Specialization | null {
  if (!value) return null;

  if (Object.values(Specialization).includes(value as Specialization)) {
    return value as Specialization;
  }

  return null;
}

/**
 * Safely validate and convert a string to ClinicTier enum
 */
export function validateClinicTier(value: string | undefined): ClinicTier {
  if (!value) return 'CORE';

  if (Object.values(ClinicTier).includes(value as ClinicTier)) {
    return value as ClinicTier;
  }

  return 'CORE';
}

/**
 * Safely validate and convert a string to BillingCycle enum
 */
export function validateBillingCycle(value: string | undefined): BillingCycle {
  if (!value) return 'MONTHLY';

  if (Object.values(BillingCycle).includes(value as BillingCycle)) {
    return value as BillingCycle;
  }

  return 'MONTHLY';
}

/**
 * Safe type for clinic settings spread
 */
export type ClinicSettings = Record<string, unknown>;

/**
 * Safely get clinic settings with proper type
 */
export function getClinicSettings(settings: unknown): ClinicSettings {
  if (typeof settings === 'object' && settings !== null) {
    return settings as Record<string, unknown>;
  }
  return {};
}
