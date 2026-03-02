import { Specialization, ClinicTier, BillingCycle } from '@workspace/db';

const SPECIALIZATION_SET = new Set<Specialization>(
  Object.values(Specialization),
);
const CLINIC_TIER_SET = new Set<ClinicTier>(Object.values(ClinicTier));
const BILLING_CYCLE_SET = new Set<BillingCycle>(Object.values(BillingCycle));

export function validateSpecializationForOnboarding(
  value: string | null | undefined,
): Specialization | null {
  if (!value) return null;

  if (SPECIALIZATION_SET.has(value as Specialization)) {
    return value as Specialization;
  }

  return null;
}

export function validateClinicTier(value: string | undefined): ClinicTier {
  if (!value) return ClinicTier.CORE;

  if (CLINIC_TIER_SET.has(value as ClinicTier)) {
    return value as ClinicTier;
  }

  return ClinicTier.CORE;
}

export function validateBillingCycle(value: string | undefined): BillingCycle {
  if (!value) return BillingCycle.MONTHLY;

  if (BILLING_CYCLE_SET.has(value as BillingCycle)) {
    return value as BillingCycle;
  }

  return BillingCycle.MONTHLY;
}

export type ClinicSettings = Record<string, unknown>;

export function getClinicSettings(settings: unknown): ClinicSettings {
  if (settings && typeof settings === 'object') {
    return settings as ClinicSettings;
  }
  return {};
}
