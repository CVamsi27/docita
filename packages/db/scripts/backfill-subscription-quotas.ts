import { ClinicTier } from "@prisma/client";
import prisma from "./prisma-script-client";
import {
  computeQuotaChanges,
  formatQuotaChange,
  type QuotaColumns,
  type QuotaPlan,
  type SubscriptionQuotaRow,
} from "./backfill-subscription-quotas.plan";

/**
 * Reconcile persisted `Subscription` quota columns with the `TierPricing`
 * catalog entry for the subscription's tier.
 *
 * Onboarding used to write its own tier-limits table whose values had drifted
 * from the canonical `TIER_LIMITS` mapping that seeds `TierPricing`. Clinics
 * onboarded before that fix therefore carry quotas that disagree with the
 * catalog every other consumer reads (overage metering, pricing config), and
 * HOSPITAL subscriptions were written with STARTER quotas.
 *
 * Idempotent: rows already matching their catalog entry are skipped, so
 * re-running after `--apply` reports zero changes and writes nothing.
 *
 * Usage:
 *   pnpm --filter @workspace/db exec ts-node scripts/backfill-subscription-quotas.ts          # dry-run
 *   pnpm --filter @workspace/db exec ts-node scripts/backfill-subscription-quotas.ts --apply  # write
 *   pnpm --filter @workspace/db exec ts-node scripts/backfill-subscription-quotas.ts --clinic-id=<id>
 */

const SAMPLE_LIMIT = 10;

const stdout = (line: string) => process.stdout.write(`${line}\n`);
const stderr = (line: string) => process.stderr.write(`${line}\n`);

function readClinicIdFilter(): string | null {
  const arg = process.argv.find((value) => value.startsWith("--clinic-id="));
  if (!arg) return null;
  return arg.slice("--clinic-id=".length).trim() || null;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const clinicIdFilter = readClinicIdFilter();

  const tierPricing = await prisma.tierPricing.findMany({
    select: {
      tier: true,
      includedPatients: true,
      includedAppointments: true,
      includedStorageGB: true,
      includedUsers: true,
    },
  });

  const targetByTier = new Map<ClinicTier, QuotaColumns>(
    tierPricing.map((row) => [
      row.tier,
      {
        includedPatients: row.includedPatients,
        includedAppointments: row.includedAppointments,
        includedStorageGB: row.includedStorageGB,
        includedUsers: row.includedUsers,
      },
    ]),
  );

  const subscriptions = await prisma.subscription.findMany({
    where: clinicIdFilter ? { clinicId: clinicIdFilter } : undefined,
    select: {
      id: true,
      clinicId: true,
      plan: true,
      includedPatients: true,
      includedAppointments: true,
      includedStorageGB: true,
      includedUsers: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (subscriptions.length === 0) {
    stdout("No subscriptions found for requested filter.");
    return;
  }

  const rows: SubscriptionQuotaRow[] = subscriptions.map((subscription) => ({
    id: subscription.id,
    clinicId: subscription.clinicId,
    plan: subscription.plan,
    includedPatients: subscription.includedPatients,
    includedAppointments: subscription.includedAppointments,
    includedStorageGB: subscription.includedStorageGB,
    includedUsers: subscription.includedUsers,
  }));
  const plan: QuotaPlan = computeQuotaChanges(targetByTier, rows);
  const changesRequired = plan.changes.length;
  let applied = 0;

  let sampled = 0;
  for (const change of plan.changes) {
    if (sampled < SAMPLE_LIMIT) {
      sampled += 1;
      stdout(
        `subscription=${change.subscription.id} clinic=${change.subscription.clinicId} plan=${change.subscription.plan} ${formatQuotaChange(
          {
            includedPatients: change.subscription.includedPatients,
            includedAppointments: change.subscription.includedAppointments,
            includedStorageGB: change.subscription.includedStorageGB,
            includedUsers: change.subscription.includedUsers,
          },
          change.target,
          change.changedFields,
        )}`,
      );
    }

    if (!apply) continue;

    await prisma.subscription.update({
      where: { id: change.subscription.id },
      data: {
        includedPatients: change.target.includedPatients,
        includedAppointments: change.target.includedAppointments,
        includedStorageGB: change.target.includedStorageGB,
        includedUsers: change.target.includedUsers,
      },
    });
    applied += 1;
  }

  stdout(
    `Scanned subscriptions=${subscriptions.length}, needing changes=${changesRequired}`,
  );
  if (changesRequired > SAMPLE_LIMIT) {
    stdout(
      `Listed the first ${SAMPLE_LIMIT} rows; totals below cover every match.`,
    );
  }
  for (const [tier, count] of plan.changesByTier) {
    stdout(`  plan ${tier}: ${count} subscriptions`);
  }
  for (const [field, count] of plan.changedRowsByField) {
    stdout(`  ${field}: ${count} subscriptions`);
  }
  for (const [tier, count] of plan.unmappedPlans) {
    stderr(
      `No TierPricing row for plan ${tier}: ${count} subscriptions skipped.`,
    );
  }

  if (changesRequired === 0) {
    stdout("No subscription quota changes required.");
    return;
  }

  if (!apply) {
    stdout("Run again with --apply to persist updates.");
    return;
  }

  stdout(`Applied updates=${applied}.`);
}

main()
  .catch((error: unknown) => {
    stderr(
      error instanceof Error
        ? error.message
        : "Unknown subscription quota backfill error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
