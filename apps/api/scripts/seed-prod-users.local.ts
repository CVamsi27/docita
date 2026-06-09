import { PrismaPg } from '@prisma/adapter-pg';
import {
  BillingCycle,
  ClinicTier,
  PrismaClient,
  Role,
  SubscriptionStatus,
} from '@workspace/db';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { Pool } from 'pg';
import path from 'node:path';

config({ path: path.resolve(__dirname, '../.env.production') });

const INTERNAL_ADMIN_EMAIL = 'admin@docita.work';
const PROFESSIONAL_USER_EMAILS = [
  'srija210v@gmail.com',
  'cvamsik99@gmail.com',
] as const;

const UNLIMITED_QUOTA = 999999;
const PROFESSIONAL_STORAGE_GB = 500;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function formatName(email: string): string {
  const localPart = email.split('@')[0] ?? email;
  return localPart
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function clinicIdForEmail(email: string): string {
  return `prod-professional-${email
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

function getPeriodEnd(periodStart: Date): Date {
  return new Date(
    periodStart.getFullYear() + 1,
    periodStart.getMonth(),
    periodStart.getDate(),
    periodStart.getHours(),
    periodStart.getMinutes(),
    periodStart.getSeconds(),
    periodStart.getMilliseconds(),
  );
}

async function upsertInternalUser(
  prisma: PrismaClient,
  password: string,
): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  await prisma.user.upsert({
    where: { email: INTERNAL_ADMIN_EMAIL },
    update: {
      password: passwordHash,
      name: 'Internal Admin',
      role: Role.INTERNAL,
      clinicId: null,
      emailVerified: true,
      onboardingStep: 'COMPLETED',
      onboardingCompletedAt: now,
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      passwordChangedAt: now,
    },
    create: {
      email: INTERNAL_ADMIN_EMAIL,
      password: passwordHash,
      name: 'Internal Admin',
      role: Role.INTERNAL,
      clinicId: null,
      emailVerified: true,
      onboardingStep: 'COMPLETED',
      onboardingCompletedAt: now,
      passwordChangedAt: now,
    },
  });
}

async function provisionProfessionalUser(
  prisma: PrismaClient,
  email: string,
  password: string,
): Promise<{ email: string; clinicId: string; userId: string }> {
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const periodEnd = getPeriodEnd(now);
  const name = formatName(email);
  const fallbackClinicId = clinicIdForEmail(email);

  return prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { email },
      select: { id: true, clinicId: true },
    });

    const clinicId = existingUser?.clinicId ?? fallbackClinicId;
    const clinicName = `${name || 'Professional'} Clinic`;

    await tx.clinic.upsert({
      where: { id: clinicId },
      update: {
        name: clinicName,
        email,
        active: true,
        tier: ClinicTier.PROFESSIONAL,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        currency: 'INR',
      },
      create: {
        id: clinicId,
        name: clinicName,
        address: 'Bengaluru, Karnataka, India',
        phone: '+910000000000',
        email,
        active: true,
        tier: ClinicTier.PROFESSIONAL,
        type: 'GENERAL',
        currency: 'INR',
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        referralCode: `PRO-${clinicId.slice(-8).toUpperCase()}`,
        settings: {
          provisionedBy: 'seed-prod-users',
          provisionedAt: now.toISOString(),
          operatingCountryCode: 'IN',
          facilityLabel: 'CLINIC',
        },
      },
    });

    await tx.mrnSequence.upsert({
      where: { clinicId },
      update: {},
      create: {
        clinicId,
        prefix: 'DOC',
        lastNumber: 0,
      },
    });

    const user = await tx.user.upsert({
      where: { email },
      update: {
        password: passwordHash,
        name: name || email,
        role: Role.ADMIN_DOCTOR,
        clinicId,
        emailVerified: true,
        onboardingStep: 'COMPLETED',
        onboardingCompletedAt: now,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        passwordChangedAt: now,
      },
      create: {
        email,
        password: passwordHash,
        name: name || email,
        role: Role.ADMIN_DOCTOR,
        clinicId,
        emailVerified: true,
        onboardingStep: 'COMPLETED',
        onboardingCompletedAt: now,
        passwordChangedAt: now,
      },
    });

    await tx.doctorClinic.upsert({
      where: {
        doctorId_clinicId: {
          doctorId: user.id,
          clinicId,
        },
      },
      update: {
        role: Role.ADMIN_DOCTOR,
        active: true,
      },
      create: {
        doctorId: user.id,
        clinicId,
        role: Role.ADMIN_DOCTOR,
        active: true,
      },
    });

    // jscpd:ignore-start
    await tx.subscription.upsert({
      where: { clinicId },
      update: {
        plan: ClinicTier.PROFESSIONAL,
        billingCycle: BillingCycle.YEARLY,
        basePriceCents: 0,
        currency: 'INR',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        includedPatients: UNLIMITED_QUOTA,
        includedAppointments: UNLIMITED_QUOTA,
        includedStorageGB: PROFESSIONAL_STORAGE_GB,
        includedUsers: UNLIMITED_QUOTA,
        cancelAtPeriodEnd: false,
        autoPayEnabled: false,
        trialEnd: null,
        cancelledAt: null,
      },
      create: {
        clinicId,
        plan: ClinicTier.PROFESSIONAL,
        billingCycle: BillingCycle.YEARLY,
        basePriceCents: 0,
        currency: 'INR',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        includedPatients: UNLIMITED_QUOTA,
        includedAppointments: UNLIMITED_QUOTA,
        includedStorageGB: PROFESSIONAL_STORAGE_GB,
        includedUsers: UNLIMITED_QUOTA,
        cancelAtPeriodEnd: false,
        autoPayEnabled: false,
      },
    });
    // jscpd:ignore-end

    await tx.auditLog.create({
      data: {
        clinicId,
        userId: user.id,
        action: 'PROD_USER_PROVISIONED',
        entityType: 'User',
        entityId: user.id,
        metadata: {
          role: Role.ADMIN_DOCTOR,
          tier: ClinicTier.PROFESSIONAL,
          access: 'unlimited',
          source: 'seed-prod-users',
        },
      },
    });

    return { email, clinicId, userId: user.id };
  });
}

async function main(): Promise<void> {
  const databaseUrl = requireEnv('DATABASE_URL');
  const internalPassword = requireEnv('DOCITA_INTERNAL_ADMIN_PASSWORD');
  const professionalPassword = requireEnv('DOCITA_PROFESSIONAL_USERS_PASSWORD');

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await upsertInternalUser(prisma, internalPassword);

    const professionalUsers = [];
    for (const email of PROFESSIONAL_USER_EMAILS) {
      professionalUsers.push(
        await provisionProfessionalUser(prisma, email, professionalPassword),
      );
    }

    process.stdout.write(
      JSON.stringify(
        {
          internalUser: INTERNAL_ADMIN_EMAIL,
          professionalUsers,
        },
        null,
        2,
      ),
    );
    process.stdout.write('\n');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Prod user provisioning failed: ${String(error)}\n`);
  process.exit(1);
});
