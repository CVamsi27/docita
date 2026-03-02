import { PrismaClient } from '@workspace/db';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getEnv } from '@/shared/modules/config/app-config';

import { seedClinicUsers } from './seed-clinic-users';
import { seedPatientsAndEncounters } from './seed-patients-encounters';
import { seedStructuredMedicalHistory } from './seed-structured-medical-history';
import { seedSchedulesAndLabTests } from './seed-schedules-lab-tests';
import { seedClinicConfigTemplates } from './seed-clinic-config-templates';
import { seedIcdCodes } from './seed-icd-codes';

async function main() {
  const env = getEnv();
  let connectionString = env.DATABASE_URL;

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
    } catch {}
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const { defaultClinic, doctor1, doctor2, doctor3 } =
      await seedClinicUsers(prisma);

    const patients = await seedPatientsAndEncounters(prisma, {
      clinicId: defaultClinic.id,
      doctor1Id: doctor1.id,
      doctor2Id: doctor2.id,
    });

    await seedStructuredMedicalHistory(prisma, patients);

    await seedSchedulesAndLabTests(prisma, {
      clinicId: defaultClinic.id,
      doctor1Id: doctor1.id,
      doctor2Id: doctor2.id,
      doctor3Id: doctor3.id,
    });

    await seedClinicConfigTemplates(prisma, {
      clinicId: defaultClinic.id,
      doctor1Id: doctor1.id,
      doctor2Id: doctor2.id,
      doctor3Id: doctor3.id,
      patients,
    });

    await seedIcdCodes(prisma);
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  process.exit(1);
});
