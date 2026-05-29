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

// Enterprise list pricing is "custom" — pick a deterministic annual amount
// for the seed so the billing dashboard renders meaningful numbers.
const ENTERPRISE_SEED_ANNUAL_INR = 240_000;

export async function seedBillingAndUsage(
  prisma: PrismaClient,
  params: SeedBillingAndUsageParams,
): Promise<void> {
  const { clinicId } = params;
  const { start: cycleStart, end: cycleEnd } = getMonthRange();
  const cycleKey = `${cycleStart.getFullYear()}-${String(
    cycleStart.getMonth() + 1,
  ).padStart(2, '0')}`;
  // Annual subscription period: today → today + 1 year.
  const subscriptionStart = new Date();
  subscriptionStart.setHours(0, 0, 0, 0);
  const subscriptionEnd = new Date(subscriptionStart);
  subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
  const legacyUtcCycleKey = `${cycleStart.getUTCFullYear()}-${String(
    cycleStart.getUTCMonth() + 1,
  ).padStart(2, '0')}`;

  const pricing = TIER_PRICING_BY_CURRENCY.INR;
  const overageRatesByTier = TIER_OVERAGE_RATES_BY_CURRENCY.INR;

  await Promise.all(
    CANONICAL_TIERS.map((tier, index) => {
      const tierName = mapPricingTierInputToTierName(tier);
      if (!tierName) {
        throw new Error(`Unsupported tier for billing seed: ${tier}`);
      }
      const tierPricing = pricing[tierName];
      const tierLimits = TIER_LIMITS[tierName];
      const overage = overageRatesByTier[tierName];
      const tierInfo = TIER_INFO[tierName];
      const features = TIER_FEATURES[tierName] ?? [];

      return prisma.tierPricing.upsert({
        where: { tier },
        update: {
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
          displayOrder: index,
          isActive: true,
        },
        create: {
          tier,
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
          displayOrder: index,
          isActive: true,
        },
      });
    }),
  );

  const activeTier = ClinicTier.ENTERPRISE;
  const activeTierName: keyof typeof TIER_LIMITS = 'ENTERPRISE';
  const activeTierLimits = TIER_LIMITS[activeTierName];

  await prisma.clinic.update({
    where: { id: clinicId },
    data: {
      tier: activeTier,
      // Explicit PlanMode = FULL keeps the seeded clinic on the full feature
      // set; switch to FRONT_DESK or CORE here to seed a mode-scoped clinic.
      planMode: PlanMode.FULL,
      currency: INR_CURRENCY,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    },
  });

  const annualBasePriceCents = toPaise(ENTERPRISE_SEED_ANNUAL_INR);

  const subscription = await prisma.subscription.upsert({
    where: { clinicId },
    update: {
      plan: activeTier,
      billingCycle: BillingCycle.YEARLY,
      basePriceCents: annualBasePriceCents,
      currency: INR_CURRENCY,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: subscriptionStart,
      currentPeriodEnd: subscriptionEnd,
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
      currentPeriodStart: subscriptionStart,
      currentPeriodEnd: subscriptionEnd,
      includedPatients: activeTierLimits.patients,
      includedAppointments: activeTierLimits.appointments ?? 0,
      includedStorageGB: activeTierLimits.storageGB,
      includedUsers: activeTierLimits.users ?? 1,
      autoPayEnabled: true,
    },
  });

  // Single PAID annual subscription payment so the billing dashboard isn't empty.
  await prisma.subscriptionPayment.upsert({
    where: { razorpayPaymentId: `seed_pay_${clinicId}` },
    update: {
      clinicId,
      subscriptionId: subscription.id,
      amountCents: annualBasePriceCents,
      grandTotalCents: annualBasePriceCents,
      subtotalCents: annualBasePriceCents,
      currency: INR_CURRENCY,
      status: 'paid',
      invoiceNumber: 'DC/ENT/SEED/0001',
      invoiceType: 'TAX_INVOICE',
      description: 'Annual enterprise subscription (seed)',
      paidAt: subscriptionStart,
    },
    create: {
      clinicId,
      subscriptionId: subscription.id,
      amountCents: annualBasePriceCents,
      grandTotalCents: annualBasePriceCents,
      subtotalCents: annualBasePriceCents,
      currency: INR_CURRENCY,
      status: 'paid',
      razorpayPaymentId: `seed_pay_${clinicId}`,
      invoiceNumber: 'DC/ENT/SEED/0001',
      invoiceType: 'TAX_INVOICE',
      description: 'Annual enterprise subscription (seed)',
      paidAt: subscriptionStart,
    },
  });

  const [completedConsultations, activeUsers] = await Promise.all([
    prisma.appointment.count({
      where: {
        clinicId,
        status: 'COMPLETED',
        updatedAt: { gte: cycleStart, lte: cycleEnd },
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
  const tierOverage = overageRatesByTier[activeTierName];

  const consultationIncluded = activeTierLimits.appointments ?? 0;
  const userIncluded = activeTierLimits.users ?? 1;
  const whatsappIncluded = whatsappPricing.includedQuota;

  const consultationOverage = Math.max(
    0,
    consultationsQuantity - consultationIncluded,
  );
  const userOverage = Math.max(0, usersQuantity - userIncluded);
  const whatsappOverage = Math.max(0, whatsappQuantity - whatsappIncluded);

  const seedEventKeys = [
    `seed:${clinicId}:${cycleKey}:consultations`,
    `seed:${clinicId}:${cycleKey}:whatsapp`,
    `seed:${clinicId}:${cycleKey}:users`,
    `seed:${clinicId}:${legacyUtcCycleKey}:consultations`,
    `seed:${clinicId}:${legacyUtcCycleKey}:whatsapp`,
    `seed:${clinicId}:${legacyUtcCycleKey}:users`,
  ];

  await prisma.usageEvent.deleteMany({
    where: {
      clinicId,
      eventKey: { in: Array.from(new Set(seedEventKeys)) },
    },
  });

  await Promise.all([
    prisma.usageEvent.upsert({
      where: { eventKey: `seed:${clinicId}:${cycleKey}:consultations` },
      update: {
        type: UsageType.APPOINTMENTS,
        quantity: consultationsQuantity,
        timestamp: cycleEnd,
        entityType: 'SeedUsage',
        entityId: cycleKey,
        metadata: { source: 'seed-v2', meter: 'consultations' },
      },
      create: {
        clinicId,
        type: UsageType.APPOINTMENTS,
        quantity: consultationsQuantity,
        timestamp: cycleEnd,
        eventKey: `seed:${clinicId}:${cycleKey}:consultations`,
        entityType: 'SeedUsage',
        entityId: cycleKey,
        metadata: { source: 'seed-v2', meter: 'consultations' },
      },
    }),
    prisma.usageEvent.upsert({
      where: { eventKey: `seed:${clinicId}:${cycleKey}:whatsapp` },
      update: {
        type: UsageType.WHATSAPP_MESSAGES,
        quantity: whatsappQuantity,
        timestamp: cycleEnd,
        entityType: 'SeedUsage',
        entityId: cycleKey,
        metadata: { source: 'seed-v2', meter: 'whatsappMessages' },
      },
      create: {
        clinicId,
        type: UsageType.WHATSAPP_MESSAGES,
        quantity: whatsappQuantity,
        timestamp: cycleEnd,
        eventKey: `seed:${clinicId}:${cycleKey}:whatsapp`,
        entityType: 'SeedUsage',
        entityId: cycleKey,
        metadata: { source: 'seed-v2', meter: 'whatsappMessages' },
      },
    }),
    prisma.usageEvent.upsert({
      where: { eventKey: `seed:${clinicId}:${cycleKey}:users` },
      update: {
        type: UsageType.USERS,
        quantity: usersQuantity,
        timestamp: cycleEnd,
        entityType: 'SeedUsage',
        entityId: cycleKey,
        metadata: { source: 'seed-v2', meter: 'users' },
      },
      create: {
        clinicId,
        type: UsageType.USERS,
        quantity: usersQuantity,
        timestamp: cycleEnd,
        eventKey: `seed:${clinicId}:${cycleKey}:users`,
        entityType: 'SeedUsage',
        entityId: cycleKey,
        metadata: { source: 'seed-v2', meter: 'users' },
      },
    }),
    prisma.usageRecord.upsert({
      where: {
        clinicId_type_periodStart: {
          clinicId,
          type: UsageType.APPOINTMENTS,
          periodStart: cycleStart,
        },
      },
      update: {
        periodEnd: cycleEnd,
        quantity: consultationsQuantity,
        includedQuota: consultationIncluded,
        overageUnits: consultationOverage,
        overageChargeCents: toPaise(
          consultationOverage * tierOverage.appointmentRate,
        ),
        metadata: { source: 'seed-v2', meter: 'consultations' },
      },
      create: {
        clinicId,
        type: UsageType.APPOINTMENTS,
        periodStart: cycleStart,
        periodEnd: cycleEnd,
        quantity: consultationsQuantity,
        includedQuota: consultationIncluded,
        overageUnits: consultationOverage,
        overageChargeCents: toPaise(
          consultationOverage * tierOverage.appointmentRate,
        ),
        metadata: { source: 'seed-v2', meter: 'consultations' },
      },
    }),
    prisma.usageRecord.upsert({
      where: {
        clinicId_type_periodStart: {
          clinicId,
          type: UsageType.WHATSAPP_MESSAGES,
          periodStart: cycleStart,
        },
      },
      update: {
        periodEnd: cycleEnd,
        quantity: whatsappQuantity,
        includedQuota: whatsappIncluded,
        overageUnits: whatsappOverage,
        overageChargeCents: toPaise(
          whatsappOverage * whatsappPricing.overageRate,
        ),
        metadata: { source: 'seed-v2', meter: 'whatsappMessages' },
      },
      create: {
        clinicId,
        type: UsageType.WHATSAPP_MESSAGES,
        periodStart: cycleStart,
        periodEnd: cycleEnd,
        quantity: whatsappQuantity,
        includedQuota: whatsappIncluded,
        overageUnits: whatsappOverage,
        overageChargeCents: toPaise(
          whatsappOverage * whatsappPricing.overageRate,
        ),
        metadata: { source: 'seed-v2', meter: 'whatsappMessages' },
      },
    }),
    prisma.usageRecord.upsert({
      where: {
        clinicId_type_periodStart: {
          clinicId,
          type: UsageType.USERS,
          periodStart: cycleStart,
        },
      },
      update: {
        periodEnd: cycleEnd,
        quantity: usersQuantity,
        includedQuota: userIncluded,
        overageUnits: userOverage,
        overageChargeCents: toPaise(userOverage * tierOverage.userRate),
        metadata: { source: 'seed-v2', meter: 'users' },
      },
      create: {
        clinicId,
        type: UsageType.USERS,
        periodStart: cycleStart,
        periodEnd: cycleEnd,
        quantity: usersQuantity,
        includedQuota: userIncluded,
        overageUnits: userOverage,
        overageChargeCents: toPaise(userOverage * tierOverage.userRate),
        metadata: { source: 'seed-v2', meter: 'users' },
      },
    }),
  ]);
}
