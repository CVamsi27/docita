import { PrismaClient, Prisma } from '@workspace/db';
import { execSync } from 'child_process';
import path from 'path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let prisma: TestPrismaClient;

type TestPrismaClient = PrismaClient & {
  getReadClient(): PrismaClient;
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
    getReadClient(): PrismaClient {
      return rawPrisma;
    },
    runUnrestricted<T>(fn: () => Promise<T>): Promise<T> {
      return fn();
    },
  }) as TestPrismaClient;

  try {
    execSync('pnpm exec prisma db push --accept-data-loss --force-reset', {
      cwd: path.join(__dirname, '../../..', 'packages/db'),
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
      },
      stdio: 'pipe',
    });
  } catch (error) {
    const execError = error as {
      message?: string;
      stderr?: Buffer;
      stdout?: Buffer;
    };
    const stderr = execError.stderr?.toString().trim();
    const stdout = execError.stdout?.toString().trim();
    throw new Error(
      [
        'Failed to prepare test database with `prisma db push --force-reset`.',
        `DATABASE_URL=${testDbUrl}`,
        stderr ? `stderr: ${stderr}` : undefined,
        stdout ? `stdout: ${stdout}` : undefined,
        execError.message ? `error: ${execError.message}` : undefined,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

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
