import { PrismaClient } from '@workspace/db';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Seed Modules
import { seedClinicUsers } from './seed-clinic-users';
import { seedPatientsAndEncounters } from './seed-patients-encounters';
import { seedStructuredMedicalHistory } from './seed-structured-medical-history';
import { seedSchedulesAndLabTests } from './seed-schedules-lab-tests';
import { seedClinicConfigTemplates } from './seed-clinic-config-templates';
import { seedIcdCodes } from './seed-icd-codes';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  let connectionString = process.env.DATABASE_URL;

  // Fix for "SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'"
  if (connectionString) {
    try {
      const url = new URL(connectionString);
      const sslMode = url.searchParams.get('sslmode');
      if (
        sslMode === 'require' ||
        sslMode === 'prefer' ||
        sslMode === 'verify-ca'
      ) {
        url.searchParams.set('sslmode', 'verify-full');
        if (!url.port) {
          url.port = '5432';
        }
        connectionString = url.toString();
      }
    } catch (error) {
      console.warn('Failed to parse DATABASE_URL for SSL adjustment', error);
    }
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('🌱 Starting database seed...');
    console.log(
      'Using Database URL:',
      process.env.DATABASE_URL
        ? process.env.DATABASE_URL.substring(0, 20) + '...'
        : 'UNDEFINED',
    );

    // 1. Clinic & Users (Doctors, Admin, Reception)
    console.log('\n--- Seeding Clinic & Users ---');
    const { defaultClinic, doctor1, doctor2, doctor3 } =
      await seedClinicUsers(prisma);
    console.log('✅ Clinic & Users seeded');

    // 2. Patients & Encounters (Appointments, Vitals, Prescriptions, Invoices, Documents)
    console.log('\n--- Seeding Patients & Encounters ---');
    const patients = await seedPatientsAndEncounters(prisma, {
      clinicId: defaultClinic.id,
      doctor1Id: doctor1.id,
      doctor2Id: doctor2.id,
    });
    console.log(`✅ ${patients.length} Patients & Encounters seeded`);

    // 3. Structured Medical History (Conditions, Allergies, Family/Social History)
    console.log('\n--- Seeding Medical History ---');
    await seedStructuredMedicalHistory(prisma, {
      patientIds: patients.map((p) => p.id),
      clinicId: defaultClinic.id,
    });
    console.log('✅ Medical History seeded');

    // 4. Schedules & Lab Tests
    console.log('\n--- Seeding Schedules & Lab Tests ---');
    await seedSchedulesAndLabTests(prisma, {
      defaultClinicId: defaultClinic.id,
      doctor1Id: doctor1.id,
      doctor2Id: doctor2.id,
      doctor3Id: doctor3.id,
    });
    console.log('✅ Schedules & Lab Tests seeded');

    // 5. Clinic Config & Templates (WhatsApp, Prescriptions)
    console.log('\n--- Seeding Config & Templates ---');
    await seedClinicConfigTemplates(prisma, {
      clinicId: defaultClinic.id,
    });
    console.log('✅ Config & Templates seeded');

    // 6. ICD-10 Codes (uses its own internal logic/files)
    console.log('\n--- Seeding ICD-10 Codes ---');
    await seedIcdCodes(prisma);
    console.log('✅ ICD-10 Codes seeded');

    console.log('\n🎉 Database seed completed successfully!');
    console.log('\nLogin credentials:');
    console.log('   Main App (http://localhost:3000):');
    console.log('   - clinic.admin@docita.work / password123 (Clinic Admin)');
    console.log(
      '   - doctor@docita.work / password123 (Dr. Vamsi - Cardiologist)',
    );
    console.log(
      '   - dr.sharma@docita.work / password123 (Dr. Priya - Pediatrician)',
    );
    console.log(
      '   - dr.dental@docita.work / password123 (Dr. Arun - Dentist)',
    );
    console.log('   - reception@docita.work / password123 (Receptionist)');
    console.log('\n   Admin Console (http://localhost:3002):');
    console.log('   - admin@docita.work / password123 (Super Admin)');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
