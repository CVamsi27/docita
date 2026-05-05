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
import { seedBillingAndUsage } from './seed-billing-subscriptions';

async function assertSeedSchemaReady(pool: Pool): Promise<void> {
  const LATEST_MIGRATION = '20260502180000_starter_list_price_inr_499';

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
  const pool = new Pool({ connectionString: env.DATABASE_URL });
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

    await seedBillingAndUsage(prisma, {
      clinicId: defaultClinic.id,
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
