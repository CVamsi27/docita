import { Specialization, ClinicTier, BillingCycle } from '@workspace/db';

export function validateSpecializationForOnboarding(
  value: string | null | undefined,
): Specialization | null {
  if (!value) return null;

  if (Object.values(Specialization).includes(value as Specialization)) {
    return value as Specialization;
  }

  return null;
}

export function validateClinicTier(value: string | undefined): ClinicTier {
  if (!value) return 'CORE' as ClinicTier;

  if (Object.values(ClinicTier).includes(value as ClinicTier)) {
    return value as ClinicTier;
  }

  return 'CORE' as ClinicTier;
}

export function validateBillingCycle(value: string | undefined): BillingCycle {
  if (!value) return 'MONTHLY' as BillingCycle;

  if (Object.values(BillingCycle).includes(value as BillingCycle)) {
    return value as BillingCycle;
  }

  return 'MONTHLY' as BillingCycle;
}

export type ClinicSettings = Record<string, unknown>;

export function getClinicSettings(settings: unknown): ClinicSettings {
  if (typeof settings === 'object' && settings !== null) {
    return settings as Record<string, unknown>;
  }
  return {};
}
