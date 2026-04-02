import { ClinicTier, SubscriptionStatus } from "@prisma/client";
import prisma from "./prisma-script-client";

type ClinicWithSubscription = {
  id: string;
  name: string;
  tier: ClinicTier;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  referralCode: string | null;
  subscription: {
    plan: ClinicTier;
    status: SubscriptionStatus;
    currentPeriodEnd: Date;
  } | null;
};

interface BackfillChange {
  clinicId: string;
  needsReferralCode: boolean;
  needsTierSync: boolean;
  needsStatusSync: boolean;
  needsTrialEndsAtSync: boolean;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function readClinicIdFilter(): string | null {
  const arg = process.argv.find((value) => value.startsWith("--clinic-id="));
  if (!arg) return null;
  return arg.slice("--clinic-id=".length).trim() || null;
}

function generateReferralCode(clinicName: string): string {
  const prefix = clinicName
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "X");
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `${prefix}-${suffix}`;
}

async function generateUniqueReferralCode(
  clinicName: string,
  reserved: Set<string>,
): Promise<string> {
  let attempts = 0;
  let code = generateReferralCode(clinicName);

  while (attempts < 16) {
    if (reserved.has(code)) {
      attempts += 1;
      code = generateReferralCode(clinicName);
      continue;
    }

    const existing = await prisma.clinic.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });

    if (!existing) {
      reserved.add(code);
      return code;
    }

    attempts += 1;
    code = generateReferralCode(clinicName);
  }

  throw new Error("Unable to generate unique clinic referral code");
}

function buildChangeSummary(clinic: ClinicWithSubscription): BackfillChange {
  const subscription = clinic.subscription;
  const targetTrialEndsAt =
    subscription?.status === SubscriptionStatus.TRIALING
      ? subscription.currentPeriodEnd
      : null;

  const needsTierSync = Boolean(subscription && clinic.tier !== subscription.plan);
  const needsStatusSync = Boolean(
    subscription && clinic.subscriptionStatus !== subscription.status,
  );
  const needsTrialEndsAtSync =
    (clinic.trialEndsAt?.getTime() ?? null) !== (targetTrialEndsAt?.getTime() ?? null);

  return {
    clinicId: clinic.id,
    needsReferralCode: !clinic.referralCode,
    needsTierSync,
    needsStatusSync,
    needsTrialEndsAtSync,
  };
}

async function run(): Promise<void> {
  const isApply = hasFlag("--apply");
  const clinicIdFilter = readClinicIdFilter();
  const reservedCodes = new Set<string>();

  const clinics = (await prisma.clinic.findMany({
    where: clinicIdFilter ? { id: clinicIdFilter } : undefined,
    select: {
      id: true,
      name: true,
      tier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      referralCode: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })) as ClinicWithSubscription[];

  if (clinics.length === 0) {
    process.stdout.write("No clinics found for requested filter.\n");
    return;
  }

  const changes = clinics
    .map((clinic) => buildChangeSummary(clinic))
    .filter(
      (change) =>
        change.needsReferralCode ||
        change.needsTierSync ||
        change.needsStatusSync ||
        change.needsTrialEndsAtSync,
    );

  process.stdout.write(
    `Scanned clinics=${clinics.length}, clinics needing changes=${changes.length}\n`,
  );

  if (changes.length === 0) {
    process.stdout.write("No backfill changes required.\n");
    return;
  }

  let applied = 0;
  let referralCodeFilled = 0;
  let tierSynced = 0;
  let statusSynced = 0;
  let trialEndsAtSynced = 0;

  for (const clinic of clinics) {
    const change = buildChangeSummary(clinic);
    if (
      !change.needsReferralCode &&
      !change.needsTierSync &&
      !change.needsStatusSync &&
      !change.needsTrialEndsAtSync
    ) {
      continue;
    }

    const subscription = clinic.subscription;
    const referralCode = clinic.referralCode
      ? clinic.referralCode
      : await generateUniqueReferralCode(clinic.name, reservedCodes);
    const targetTier = subscription?.plan ?? clinic.tier;
    const targetStatus = subscription?.status ?? clinic.subscriptionStatus;
    const targetTrialEndsAt =
      subscription?.status === SubscriptionStatus.TRIALING
        ? subscription.currentPeriodEnd
        : null;

    if (!isApply) {
      continue;
    }

    await prisma.clinic.update({
      where: { id: clinic.id },
      data: {
        referralCode,
        tier: targetTier,
        subscriptionStatus: targetStatus,
        trialEndsAt: targetTrialEndsAt,
      },
    });

    applied += 1;
    if (change.needsReferralCode) referralCodeFilled += 1;
    if (change.needsTierSync) tierSynced += 1;
    if (change.needsStatusSync) statusSynced += 1;
    if (change.needsTrialEndsAtSync) trialEndsAtSynced += 1;
  }

  if (!isApply) {
    const previewReferral = changes.filter((c) => c.needsReferralCode).length;
    const previewTier = changes.filter((c) => c.needsTierSync).length;
    const previewStatus = changes.filter((c) => c.needsStatusSync).length;
    const previewTrial = changes.filter((c) => c.needsTrialEndsAtSync).length;

    process.stdout.write(
      `Dry run summary: referralCode=${previewReferral}, tier=${previewTier}, status=${previewStatus}, trialEndsAt=${previewTrial}\n`,
    );
    process.stdout.write(
      "Run again with --apply to persist updates.\n",
    );
    return;
  }

  process.stdout.write(
    `Applied updates=${applied}, referralCode=${referralCodeFilled}, tier=${tierSynced}, status=${statusSynced}, trialEndsAt=${trialEndsAtSynced}\n`,
  );
}

run()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown onboarding backfill error";
    process.stderr.write(`${message}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
