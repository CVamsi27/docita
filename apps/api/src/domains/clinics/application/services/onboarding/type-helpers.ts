import { z } from 'zod';
import { Specialization, ClinicTier, BillingCycle } from '@workspace/db';

const specializationSchema = z.nativeEnum(Specialization);
const clinicTierSchema = z.nativeEnum(ClinicTier);
const billingCycleSchema = z.nativeEnum(BillingCycle);

export function validateSpecializationForOnboarding(
  value: string | null | undefined,
): Specialization | null {
  if (!value) return null;

  const parsed = specializationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function validateClinicTier(value: string | undefined): ClinicTier {
  if (!value) return ClinicTier.ESSENTIAL;

  const parsed = clinicTierSchema.safeParse(value);
  return parsed.success ? parsed.data : ClinicTier.ESSENTIAL;
}

export function validateBillingCycle(value: string | undefined): BillingCycle {
  if (!value) return BillingCycle.MONTHLY;

  const parsed = billingCycleSchema.safeParse(value);
  return parsed.success ? parsed.data : BillingCycle.MONTHLY;
}

/**
 * Plans eligible for the unpaid free trial: every published tier except
 * Enterprise, which is custom-priced and routed through sales (no self-serve
 * trial). Front Desk / Core variants of trial-eligible tiers stay eligible.
 */
export function isTrialEligibleTier(tier: ClinicTier): boolean {
  return tier !== ClinicTier.ENTERPRISE;
}

export type ClinicSettings = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getClinicSettings(settings: unknown): ClinicSettings {
  return isRecord(settings) ? settings : {};
}
