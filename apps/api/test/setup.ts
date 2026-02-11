import { PrismaClient } from '@workspace/db';
import { execSync } from 'child_process';
import path from 'path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let prisma: PrismaClient;

export function setupTestDatabase() {
  const testDbUrl = process.env.DATABASE_URL_TEST;

  if (!testDbUrl) {
    throw new Error(
      'DATABASE_URL_TEST is not defined. Tests must run against a dedicated test database.',
    );
  }

  const pool = new Pool({ connectionString: testDbUrl });
  const adapter = new PrismaPg(pool);
  const rawPrisma = new PrismaClient({ adapter });

  // Mock runUnrestricted which is missing in plain PrismaClient
  // but present in PrismaService
  prisma = Object.assign(rawPrisma, {
    runUnrestricted<T>(fn: () => Promise<T>): Promise<T> {
      // For tests, we can just run the function directly
      // as tenant isolation is usually not the focus of these E2E tests
      // or we can import tenantStorage if needed.
      return fn();
    },
  }) as any;

  // Run migrations for test database
  try {
    execSync('npx prisma db push --accept-data-loss --force-reset', {
      cwd: path.join(__dirname, '../../..', 'packages/db'),
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
      },
      stdio: 'pipe',
    });
  } catch (e) {
    console.warn(
      'Migrations may have already been applied or failed:',
      e.message,
    );
  }

  return prisma;
}

export async function resetDatabase() {
  if (!prisma) return;

  // Clear all tables in correct order (respecting foreign keys)
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
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (e) {
      // Table might not exist, continue
    }
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
