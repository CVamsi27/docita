import {
  BillingCycle,
  ClinicTier,
  PlanMode,
  PrismaClient,
  SubscriptionStatus,
  UsageType,
} from '@workspace/db';
import {
  TIER_FEATURES,
  TIER_INFO,
  TIER_LIMITS,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  TIER_PRICING_BY_CURRENCY,
} from '@workspace/types';
import { getWhatsAppAddonPricingByCurrency } from '@workspace/utils';
import { mapPricingTierInputToTierName } from '@/domains/billing/core/services/pricing-helpers';

interface SeedBillingAndUsageParams {
  clinicId: string;
}

type TierName = keyof typeof TIER_LIMITS;

interface SeedBillingPeriods {
  cycleStart: Date;
  cycleEnd: Date;
  cycleKey: string;
  legacyUtcCycleKey: string;
  subscriptionStart: Date;
  subscriptionEnd: Date;
}

interface SeedSubscriptionResult {
  subscriptionId: string;
  activeTierName: 'ENTERPRISE';
  annualBasePriceCents: number;
}

interface SeedUsageMetrics {
  consultationsQuantity: number;
  usersQuantity: number;
  whatsappQuantity: number;
  consultationIncluded: number;
  userIncluded: number;
  whatsappIncluded: number;
  consultationOverage: number;
  userOverage: number;
  whatsappOverage: number;
  appointmentOverageRate: number;
  userOverageRate: number;
  whatsappOverageRate: number;
}

const CANONICAL_TIERS: ClinicTier[] = [
  ClinicTier.STARTER,
  ClinicTier.FRONT_DESK,
  ClinicTier.FRONT_DESK_CLINIC,
  ClinicTier.FRONT_DESK_HOSPITAL,
  ClinicTier.ESSENTIAL,
  ClinicTier.PROFESSIONAL,
  ClinicTier.HOSPITAL,
  ClinicTier.ENTERPRISE,
];

const INR_CURRENCY = 'INR';

function toPaise(amount: number | string): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return 0;
  }
  return Math.round(amount * 100);
}

function getMonthRange(date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { start, end };
}

const ENTERPRISE_SEED_ANNUAL_INR = 240_000;

export async function seedBillingAndUsage(
  prisma: PrismaClient,
  params: SeedBillingAndUsageParams,
): Promise<void> {
  const { clinicId } = params;
  const periods = getSeedBillingPeriods();

  await seedCanonicalTierPricing(prisma);
  const subscription = await activateEnterpriseSeedSubscription(
    prisma,
    clinicId,
    periods,
  );
  await seedAnnualSubscriptionPayment(
    prisma,
    clinicId,
    subscription,
    periods.subscriptionStart,
  );
  const usageMetrics = await getSeedUsageMetrics(
    prisma,
    clinicId,
    periods,
    subscription.activeTierName,
  );
  await replaceSeedUsageEvents(prisma, clinicId, periods);
  await Promise.all([
    seedUsageEvents(prisma, clinicId, periods, usageMetrics),
    seedUsageRecords(prisma, clinicId, periods, usageMetrics),
  ]);
}

function getSeedBillingPeriods(): SeedBillingPeriods {
  const { start: cycleStart, end: cycleEnd } = getMonthRange();
  const cycleKey = `${cycleStart.getFullYear()}-${String(
    cycleStart.getMonth() + 1,
  ).padStart(2, '0')}`;
  const subscriptionStart = new Date();
  subscriptionStart.setHours(0, 0, 0, 0);
  const subscriptionEnd = new Date(subscriptionStart);
  subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
  const legacyUtcCycleKey = `${cycleStart.getUTCFullYear()}-${String(
    cycleStart.getUTCMonth() + 1,
  ).padStart(2, '0')}`;

  return {
    cycleStart,
    cycleEnd,
    cycleKey,
    legacyUtcCycleKey,
    subscriptionStart,
    subscriptionEnd,
  };
}

async function seedCanonicalTierPricing(prisma: PrismaClient): Promise<void> {
  await Promise.all(
    CANONICAL_TIERS.map((tier, index) => {
      const tierName = mapPricingTierInputToTierName(tier);
      if (!tierName) {
        throw new Error(`Unsupported tier for billing seed: ${tier}`);
      }
      const data = getTierPricingSeedData(tierName, index);

      return prisma.tierPricing.upsert({
        where: { tier },
        update: data,
        create: { tier, ...data },
      });
    }),
  );
}

function getTierPricingSeedData(tierName: TierName, displayOrder: number) {
  const tierPricing = TIER_PRICING_BY_CURRENCY.INR[tierName];
  const tierLimits = TIER_LIMITS[tierName];
  const overage = TIER_OVERAGE_RATES_BY_CURRENCY.INR[tierName];
  const tierInfo = TIER_INFO[tierName];
  const features = TIER_FEATURES[tierName] ?? [];

  return {
    monthlyBasePriceCents: toPaise(tierPricing.monthly),
    currency: INR_CURRENCY,
    includedPatients: tierLimits.patients,
    includedAppointments: tierLimits.appointments ?? 0,
    includedStorageGB: tierLimits.storageGB,
    includedUsers: tierLimits.users ?? 1,
    overagePatientCents: toPaise(overage.patientRate),
    overageAppointmentCents: toPaise(overage.appointmentRate),
    overageStorageCents: toPaise(overage.storageRate),
    overageUserCents: toPaise(overage.userRate),
    overagePrescriptionCents: toPaise(overage.prescriptionRate),
    overageInvoiceCents: toPaise(overage.invoiceRate),
    overageOcrPageCents: toPaise(overage.ocrPageRate),
    overageApiCallCents: toPaise(overage.apiCallRate),
    features,
    name: tierInfo.name,
    description: tierInfo.description,
    tagline: tierInfo.tagline,
    color: tierInfo.color,
    displayOrder,
    isActive: true,
  };
}

async function activateEnterpriseSeedSubscription(
  prisma: PrismaClient,
  clinicId: string,
  periods: SeedBillingPeriods,
): Promise<SeedSubscriptionResult> {
  const activeTier = ClinicTier.ENTERPRISE;
  const activeTierName = 'ENTERPRISE';
  const activeTierLimits = TIER_LIMITS[activeTierName];
  const annualBasePriceCents = toPaise(ENTERPRISE_SEED_ANNUAL_INR);

  await prisma.clinic.update({
    where: { id: clinicId },
    data: {
      tier: activeTier,
      planMode: PlanMode.FULL,
      currency: INR_CURRENCY,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    },
  });

  const subscription = await prisma.subscription.upsert({
    where: { clinicId },
    update: {
      plan: activeTier,
      billingCycle: BillingCycle.YEARLY,
      basePriceCents: annualBasePriceCents,
      currency: INR_CURRENCY,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: periods.subscriptionStart,
      currentPeriodEnd: periods.subscriptionEnd,
      includedPatients: activeTierLimits.patients,
      includedAppointments: activeTierLimits.appointments ?? 0,
      includedStorageGB: activeTierLimits.storageGB,
      includedUsers: activeTierLimits.users ?? 1,
      cancelAtPeriodEnd: false,
      autoPayEnabled: true,
    },
    create: {
      clinicId,
      plan: activeTier,
      billingCycle: BillingCycle.YEARLY,
      basePriceCents: annualBasePriceCents,
      currency: INR_CURRENCY,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: periods.subscriptionStart,
      currentPeriodEnd: periods.subscriptionEnd,
      includedPatients: activeTierLimits.patients,
      includedAppointments: activeTierLimits.appointments ?? 0,
      includedStorageGB: activeTierLimits.storageGB,
      includedUsers: activeTierLimits.users ?? 1,
      autoPayEnabled: true,
    },
  });

  return {
    subscriptionId: subscription.id,
    activeTierName,
    annualBasePriceCents,
  };
}

async function seedAnnualSubscriptionPayment(
  prisma: PrismaClient,
  clinicId: string,
  subscription: SeedSubscriptionResult,
  paidAt: Date,
): Promise<void> {
  const data = {
    clinicId,
    subscriptionId: subscription.subscriptionId,
    amountCents: subscription.annualBasePriceCents,
    grandTotalCents: subscription.annualBasePriceCents,
    subtotalCents: subscription.annualBasePriceCents,
    currency: INR_CURRENCY,
    status: 'paid',
    invoiceNumber: 'DC/ENT/SEED/0001',
    invoiceType: 'TAX_INVOICE',
    description: 'Annual enterprise subscription (seed)',
    paidAt,
  };

  await prisma.subscriptionPayment.upsert({
    where: { razorpayPaymentId: `seed_pay_${clinicId}` },
    update: data,
    create: { ...data, razorpayPaymentId: `seed_pay_${clinicId}` },
  });
}

async function getSeedUsageMetrics(
  prisma: PrismaClient,
  clinicId: string,
  periods: SeedBillingPeriods,
  activeTierName: 'ENTERPRISE',
): Promise<SeedUsageMetrics> {
  const [completedConsultations, activeUsers] = await Promise.all([
    prisma.appointment.count({
      where: {
        clinicId,
        status: 'COMPLETED',
        updatedAt: { gte: periods.cycleStart, lte: periods.cycleEnd },
      },
    }),
    prisma.user.count({
      where: { clinicId },
    }),
  ]);

  const whatsappQuantity = 420;
  const usersQuantity = activeUsers;
  const consultationsQuantity = completedConsultations;

  const whatsappPricing = getWhatsAppAddonPricingByCurrency(
    activeTierName,
    'INR',
  );
  const tierOverage = TIER_OVERAGE_RATES_BY_CURRENCY.INR[activeTierName];
  const activeTierLimits = TIER_LIMITS[activeTierName];

  const consultationIncluded = activeTierLimits.appointments ?? 0;
  const userIncluded = activeTierLimits.users ?? 1;
  const whatsappIncluded = whatsappPricing.includedQuota;

  const consultationOverage = Math.max(
    0,
    consultationsQuantity - consultationIncluded,
  );
  const userOverage = Math.max(0, usersQuantity - userIncluded);
  const whatsappOverage = Math.max(0, whatsappQuantity - whatsappIncluded);

  return {
    consultationsQuantity,
    usersQuantity,
    whatsappQuantity,
    consultationIncluded,
    userIncluded,
    whatsappIncluded,
    consultationOverage,
    userOverage,
    whatsappOverage,
    appointmentOverageRate: tierOverage.appointmentRate,
    userOverageRate: tierOverage.userRate,
    whatsappOverageRate: whatsappPricing.overageRate,
  };
}

async function replaceSeedUsageEvents(
  prisma: PrismaClient,
  clinicId: string,
  periods: SeedBillingPeriods,
): Promise<void> {
  const seedEventKeys = [
    `seed:${clinicId}:${periods.cycleKey}:consultations`,
    `seed:${clinicId}:${periods.cycleKey}:whatsapp`,
    `seed:${clinicId}:${periods.cycleKey}:users`,
    `seed:${clinicId}:${periods.legacyUtcCycleKey}:consultations`,
    `seed:${clinicId}:${periods.legacyUtcCycleKey}:whatsapp`,
    `seed:${clinicId}:${periods.legacyUtcCycleKey}:users`,
  ];

  await prisma.usageEvent.deleteMany({
    where: {
      clinicId,
      eventKey: { in: Array.from(new Set(seedEventKeys)) },
    },
  });
}

async function seedUsageEvents(
  prisma: PrismaClient,
  clinicId: string,
  periods: SeedBillingPeriods,
  usage: SeedUsageMetrics,
): Promise<void> {
  await Promise.all([
    upsertUsageEvent(prisma, clinicId, periods, {
      type: UsageType.APPOINTMENTS,
      quantity: usage.consultationsQuantity,
      meter: 'consultations',
    }),
    upsertUsageEvent(prisma, clinicId, periods, {
      type: UsageType.WHATSAPP_MESSAGES,
      quantity: usage.whatsappQuantity,
      meter: 'whatsappMessages',
    }),
    upsertUsageEvent(prisma, clinicId, periods, {
      type: UsageType.USERS,
      quantity: usage.usersQuantity,
      meter: 'users',
    }),
  ]);
}

async function upsertUsageEvent(
  prisma: PrismaClient,
  clinicId: string,
  periods: SeedBillingPeriods,
  event: { type: UsageType; quantity: number; meter: string },
): Promise<void> {
  const eventKey = `seed:${clinicId}:${periods.cycleKey}:${getSeedEventKeySuffix(
    event.meter,
  )}`;
  const data = {
    type: event.type,
    quantity: event.quantity,
    timestamp: periods.cycleEnd,
    entityType: 'SeedUsage',
    entityId: periods.cycleKey,
    metadata: { source: 'seed-v2', meter: event.meter },
  };

  await prisma.usageEvent.upsert({
    where: { eventKey },
    update: data,
    create: { clinicId, eventKey, ...data },
  });
}

function getSeedEventKeySuffix(meter: string): string {
  if (meter === 'whatsappMessages') return 'whatsapp';
  return meter;
}

async function seedUsageRecords(
  prisma: PrismaClient,
  clinicId: string,
  periods: SeedBillingPeriods,
  usage: SeedUsageMetrics,
): Promise<void> {
  await Promise.all([
    upsertUsageRecord(prisma, clinicId, periods, {
      type: UsageType.APPOINTMENTS,
      quantity: usage.consultationsQuantity,
      includedQuota: usage.consultationIncluded,
      overageUnits: usage.consultationOverage,
      overageRate: usage.appointmentOverageRate,
      meter: 'consultations',
    }),
    upsertUsageRecord(prisma, clinicId, periods, {
      type: UsageType.WHATSAPP_MESSAGES,
      quantity: usage.whatsappQuantity,
      includedQuota: usage.whatsappIncluded,
      overageUnits: usage.whatsappOverage,
      overageRate: usage.whatsappOverageRate,
      meter: 'whatsappMessages',
    }),
    upsertUsageRecord(prisma, clinicId, periods, {
      type: UsageType.USERS,
      quantity: usage.usersQuantity,
      includedQuota: usage.userIncluded,
      overageUnits: usage.userOverage,
      overageRate: usage.userOverageRate,
      meter: 'users',
    }),
  ]);
}

async function upsertUsageRecord(
  prisma: PrismaClient,
  clinicId: string,
  periods: SeedBillingPeriods,
  record: {
    type: UsageType;
    quantity: number;
    includedQuota: number;
    overageUnits: number;
    overageRate: number;
    meter: string;
  },
): Promise<void> {
  const data = {
    periodEnd: periods.cycleEnd,
    quantity: record.quantity,
    includedQuota: record.includedQuota,
    overageUnits: record.overageUnits,
    overageChargeCents: toPaise(record.overageUnits * record.overageRate),
    metadata: { source: 'seed-v2', meter: record.meter },
  };

  await prisma.usageRecord.upsert({
    where: {
      clinicId_type_periodStart: {
        clinicId,
        type: record.type,
        periodStart: periods.cycleStart,
      },
    },
    update: data,
    create: {
      clinicId,
      type: record.type,
      periodStart: periods.cycleStart,
      ...data,
    },
  });
}
