import { PrismaClient, Prisma } from '@workspace/db';
import { execSync } from 'child_process';
import path from 'path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let prisma: PrismaClient;

type TestPrismaClient = PrismaClient & {
  runUnrestricted<T>(fn: () => Promise<T>): Promise<T>;
};

export function setupTestDatabase() {
  const testDbUrl = process.env.DATABASE_URL;

  if (!testDbUrl) {
    throw new Error(
      'DATABASE_URL is not defined. Tests must run against a dedicated test database.',
    );
  }

  const pool = new Pool({ connectionString: testDbUrl });
  const adapter = new PrismaPg(pool);
  const rawPrisma = new PrismaClient({ adapter });

  prisma = Object.assign(rawPrisma, {
    runUnrestricted<T>(fn: () => Promise<T>): Promise<T> {
      return fn();
    },
  }) as TestPrismaClient;

  try {
    execSync('npx prisma db push --accept-data-loss --force-reset', {
      cwd: path.join(__dirname, '../../..', 'packages/db'),
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
      },
      stdio: 'pipe',
    });
  } catch (_e) {}

  return prisma;
}

export async function resetDatabase() {
  if (!prisma) return;

  const tables = [
    'RefreshToken',
    'SubscriptionReminder',
    'SubscriptionPayment',
    'Subscription',
    'ReferralCredit',
    'Referral',
    'ErrorLog',
    'ApiRequest',
    'SystemMetric',
    'PerformanceAggregate',
    'WhatsappMessage',
    'WhatsappConversation',
    'WhatsappFlow',
    'WhatsappLog',
    'LabTestOrder',
    'LabTest',
    'InventoryMovement',
    'InventoryItem',
    'QueueToken',
    'AppointmentReminder',
    'ReminderSettings',
    'PatientMergeSuggestion',
    'OcrDocument',
    'ImportJob',
    'DoctorFavoriteCode',
    'Procedure',
    'Diagnosis',
    'VitalSign',
    'Medication',
    'Prescription',
    'Invoice',
    'PaymentSession',
    'Document',
    'PatientTag',
    'Patient',
    'ClinicalTemplate',
    'CustomField',
    'DoctorTimeOff',
    'DoctorSchedule',
    'DoctorSpecialization',
    'DoctorCertification',
    'DoctorEducation',
    'DoctorClinic',
    'Appointment',
    'Clinic',
    'User',
    'PrescriptionTemplate',
    'AuditLog',
    'Feedback',
    'IcdCode',
    'CptCode',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRaw(
        Prisma.sql`TRUNCATE TABLE ${Prisma.raw(`"${table}"`)} CASCADE`,
      );
    } catch (_e) {}
  }
}

export async function closeDatabase() {
  if (prisma) {
    await prisma.$disconnect();
  }
}

export function getPrismaInstance() {
  return prisma;
}
