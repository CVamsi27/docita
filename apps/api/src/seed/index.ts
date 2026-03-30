import 'dotenv/config';
import { PrismaClient } from '@workspace/db';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getEnv } from '@/shared/modules/config/app-config';

import { seedClinicUsers } from './seed-clinic-users';
import { seedPatientsAndEncounters } from './seed-patients-encounters';
import { seedStructuredMedicalHistory } from './seed-structured-medical-history';
import { seedSchedulesAndLabTests } from './seed-schedules-lab-tests';
import { seedClinicConfigTemplates } from './seed-clinic-config-templates';

async function assertSeedSchemaReady(pool: Pool): Promise<void> {
  const LATEST_MIGRATION = '20260316000000_fix_schema_drift_post_reset';

  const result = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM _prisma_migrations
      WHERE migration_name = $1
        AND finished_at IS NOT NULL
    `,
    [LATEST_MIGRATION],
  );

  if (result.rows[0]?.count !== '1') {
    throw new Error(
      `Database is behind migrations: "${LATEST_MIGRATION}" has not been applied. ` +
        'Run `pnpm db:migrate` before seeding.',
    );
  }
}

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
          url.port = '5434';
        }
        connectionString = url.toString();
      }
    } catch {}
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await assertSeedSchemaReady(pool);

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
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Seeding failed: ${String(error)}\n`);
  process.exit(1);
});
