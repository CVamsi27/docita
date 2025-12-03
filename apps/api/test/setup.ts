import { PrismaClient } from '@workspace/db';
import { execSync } from 'child_process';
import path from 'path';

let prisma: PrismaClient;
let migrationAttempted = false;

async function waitForDatabase(
  databaseUrl: string,
  maxRetries: number = 10,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const testClient = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      });
      await testClient.$connect();
      await testClient.$disconnect();
      console.log('Database is ready');
      return;
    } catch (error) {
      if (i < maxRetries - 1) {
        console.log(
          `Database not ready, retrying... (${i + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        throw new Error(
          `Failed to connect to database after ${maxRetries} retries`,
        );
      }
    }
  }
}

export function setupTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL_TEST or DATABASE_URL environment variable is not set',
    );
  }

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  // Run migrations for test database (only once)
  if (!migrationAttempted) {
    migrationAttempted = true;
    try {
      // Wait for database to be ready before running migrations
      console.log('Waiting for database to be ready...');
      const testClient = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      });
      try {
        let retries = 0;
        while (retries < 30) {
          try {
            await testClient.$connect();
            console.log('Database connection successful');
            break;
          } catch (e) {
            retries++;
            if (retries >= 30) throw e;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } finally {
        await testClient.$disconnect();
      }

      // Run migrations
      execSync('npx prisma migrate deploy', {
        cwd: path.join(__dirname, '../../..', 'packages/db'),
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
        },
        stdio: 'pipe',
      });
      console.log('Database migrations completed');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn(
        'Database migrations may have already been applied or failed:',
        errorMessage,
      );
      // Don't throw - migrations may have already been applied
    }
  }

  return prisma;
}

export async function resetDatabase() {
  if (!prisma) return;

  // Clear all tables in correct order (respecting foreign keys)
  const tables = [
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
