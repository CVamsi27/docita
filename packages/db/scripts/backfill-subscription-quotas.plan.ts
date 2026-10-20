import type { ClinicTier } from "@prisma/client";

/**
 * Pure planning half of `backfill-subscription-quotas.ts`.
 *
 * The CLI script owns Prisma I/O and output; everything here is a total
 * function over its inputs so the rerun/idempotency contract can be tested
 * without a database: applying every planned target and planning again must
 * yield zero changes.
 */

export interface QuotaColumns {
  includedPatients: number;
  includedAppointments: number;
  includedStorageGB: number;
  includedUsers: number;
}

export const QUOTA_FIELDS: readonly (keyof QuotaColumns)[] = [
  "includedPatients",
  "includedAppointments",
  "includedStorageGB",
  "includedUsers",
];

export interface SubscriptionQuotaRow {
  id: string;
  clinicId: string;
  plan: ClinicTier;
  includedPatients: number;
  includedAppointments: number;
  includedStorageGB: number;
  includedUsers: number;
}

export interface QuotaChange {
  subscription: SubscriptionQuotaRow;
  target: QuotaColumns;
  changedFields: readonly (keyof QuotaColumns)[];
}

export interface QuotaPlan {
  changes: QuotaChange[];
  changesByTier: Map<ClinicTier, number>;
  changedRowsByField: Map<keyof QuotaColumns, number>;
  unmappedPlans: Map<ClinicTier, number>;
}

export function formatQuotaChange(
  current: QuotaColumns,
  target: QuotaColumns,
  changedFields: readonly (keyof QuotaColumns)[],
): string {
  return changedFields
    .map((field) => `${field}: ${current[field]} -> ${target[field]}`)
    .join(", ");
}

export function computeQuotaChanges(
  targetByTier: Map<ClinicTier, QuotaColumns>,
  subscriptions: readonly SubscriptionQuotaRow[],
): QuotaPlan {
  const plan: QuotaPlan = {
    changes: [],
    changesByTier: new Map(),
    changedRowsByField: new Map(),
    unmappedPlans: new Map(),
  };

  for (const subscription of subscriptions) {
    const target = targetByTier.get(subscription.plan);
    if (!target) {
      plan.unmappedPlans.set(
        subscription.plan,
        (plan.unmappedPlans.get(subscription.plan) ?? 0) + 1,
      );
      continue;
    }

    const current: QuotaColumns = {
      includedPatients: subscription.includedPatients,
      includedAppointments: subscription.includedAppointments,
      includedStorageGB: subscription.includedStorageGB,
      includedUsers: subscription.includedUsers,
    };
    const changedFields = QUOTA_FIELDS.filter(
      (field) => current[field] !== target[field],
    );
    if (changedFields.length === 0) continue;

    plan.changes.push({ subscription, target, changedFields });
    plan.changesByTier.set(
      subscription.plan,
      (plan.changesByTier.get(subscription.plan) ?? 0) + 1,
    );
    for (const field of changedFields) {
      plan.changedRowsByField.set(
        field,
        (plan.changedRowsByField.get(field) ?? 0) + 1,
      );
    }
  }

  return plan;
}
