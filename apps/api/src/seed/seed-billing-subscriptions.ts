import {
  BillingCycle,
  ClinicTier,
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
  getWhatsAppAddonPricingByCurrency,
} from '@workspace/types';

interface SeedBillingAndUsageParams {
  clinicId: string;
}

const CANONICAL_TIERS: ClinicTier[] = [
  ClinicTier.STARTER,
  ClinicTier.ESSENTIAL,
  ClinicTier.PROFESSIONAL,
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

export async function seedBillingAndUsage(
  prisma: PrismaClient,
  params: SeedBillingAndUsageParams,
): Promise<void> {
  const { clinicId } = params;
  const { start: cycleStart, end: cycleEnd } = getMonthRange();
  const cycleKey = `${cycleStart.getFullYear()}-${String(
    cycleStart.getMonth() + 1,
  ).padStart(2, '0')}`;
  const legacyUtcCycleKey = `${cycleStart.getUTCFullYear()}-${String(
    cycleStart.getUTCMonth() + 1,
  ).padStart(2, '0')}`;

  const pricing = TIER_PRICING_BY_CURRENCY.INR;
  const overageRatesByTier = TIER_OVERAGE_RATES_BY_CURRENCY.INR;

  await Promise.all(
    CANONICAL_TIERS.map((tier, index) => {
      const tierName = tier as keyof typeof TIER_LIMITS;
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
  const activeTierPricing = pricing[activeTierName];

  await prisma.clinic.update({
    where: { id: clinicId },
    data: {
      tier: activeTier,
      currency: INR_CURRENCY,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    },
  });

  await prisma.subscription.upsert({
    where: { clinicId },
    update: {
      plan: activeTier,
      billingCycle: BillingCycle.MONTHLY,
      basePriceCents: toPaise(activeTierPricing.monthly),
      currency: INR_CURRENCY,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: cycleStart,
      currentPeriodEnd: cycleEnd,
      includedPatients: activeTierLimits.patients,
      includedAppointments: activeTierLimits.appointments ?? 0,
      includedStorageGB: activeTierLimits.storageGB,
      includedUsers: activeTierLimits.users ?? 1,
      cancelAtPeriodEnd: false,
      autoPayEnabled: false,
    },
    create: {
      clinicId,
      plan: activeTier,
      billingCycle: BillingCycle.MONTHLY,
      basePriceCents: toPaise(activeTierPricing.monthly),
      currency: INR_CURRENCY,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: cycleStart,
      currentPeriodEnd: cycleEnd,
      includedPatients: activeTierLimits.patients,
      includedAppointments: activeTierLimits.appointments ?? 0,
      includedStorageGB: activeTierLimits.storageGB,
      includedUsers: activeTierLimits.users ?? 1,
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
