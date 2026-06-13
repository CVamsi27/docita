import 'dotenv/config';
import { PrismaClient } from '@workspace/db';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { createUtcPoolConfig } from '@workspace/db';
import { getEnv } from '@/shared/modules/config/app-config';

import { seedClinicUsers } from './seed-clinic-users';
import { seedPatientsAndEncounters } from './seed-patients-encounters';
import { seedStructuredMedicalHistory } from './seed-structured-medical-history';
import { seedSchedulesAndLabTests } from './seed-schedules-lab-tests';
import { seedClinicConfigTemplates } from './seed-clinic-config-templates';
import { seedBillingAndUsage } from './seed-billing-subscriptions';
import { seedIpd } from './seed-ipd';
import { seedInventory } from './seed-inventory';
import { seedOperations } from './seed-operations';
import { seedPdfs } from './seed-pdfs';

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
  const pool = new Pool(
    createUtcPoolConfig({ connectionString: env.DATABASE_URL }),
  );
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await assertSeedSchemaReady(pool);

    const {
      defaultClinic,
      clinicAdmin,
      adminDoctor,
      doctor1,
      doctor2,
      doctor3,
      nurse,
      patientPortalUser,
    } = await seedClinicUsers(prisma);

    const patients = await seedPatientsAndEncounters(prisma, {
      clinicId: defaultClinic.id,
      adminDoctorId: adminDoctor.id,
      doctor1Id: doctor1.id,
      doctor2Id: doctor2.id,
      patientPortalUserId: patientPortalUser.id,
    });

    await seedStructuredMedicalHistory(prisma, patients);

    await seedSchedulesAndLabTests(prisma, {
      clinicId: defaultClinic.id,
      adminDoctorId: adminDoctor.id,
      doctor1Id: doctor1.id,
      doctor2Id: doctor2.id,
      doctor3Id: doctor3.id,
      patientIds: patients.map((p) => p.id),
    });

    await seedIpd(prisma, {
      clinicId: defaultClinic.id,
      doctor1Id: doctor1.id,
      doctor2Id: doctor2.id,
      patientIds: patients.map((p) => p.id),
    });

    await seedInventory(prisma, {
      clinicId: defaultClinic.id,
      createdByUserId: clinicAdmin.id,
    });

    await seedOperations(prisma, {
      clinicId: defaultClinic.id,
      adminUserId: clinicAdmin.id,
      doctor1Id: doctor1.id,
      doctor2Id: doctor2.id,
      nurseId: nurse.id,
      patientPortalUserId: patientPortalUser.id,
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

    await seedPdfs(prisma, { clinicId: defaultClinic.id });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

function errorStack(value: unknown): string | null {
  if (
    value &&
    typeof value === 'object' &&
    'stack' in value &&
    typeof value.stack === 'string'
  )
    return value.stack;
  return null;
}

function nestedErrors(value: unknown): readonly unknown[] {
  if (
    value &&
    typeof value === 'object' &&
    'errors' in value &&
    Array.isArray(value.errors)
  ) {
    return value.errors;
  }
  return [];
}

main().catch((error: unknown) => {
  process.stderr.write(`Seeding failed: ${String(error)}\n`);
  const stack = errorStack(error);
  if (stack) {
    process.stderr.write(`${stack}\n`);
  }
  nestedErrors(error).forEach((sub, i) => {
    process.stderr.write(
      `AggregateError[${i}]: ${errorStack(sub) ?? String(sub)}\n`,
    );
  });
  process.exit(1);
});
