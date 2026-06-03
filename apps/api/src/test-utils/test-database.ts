import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import * as path from 'path';

let container: StartedPostgreSqlContainer | null = null;
let prisma: PrismaClient | null = null;

export async function startTestDatabase(): Promise<string> {
  container = await new PostgreSqlContainer('postgis/postgis:16-3.4')
    .withDatabase('docita_test')
    .withUsername('test')
    .withPassword('test')
    .withExposedPorts(5432)
    .start();

  const databaseUrl = container.getConnectionUri();
  process.env.DATABASE_URL = databaseUrl;

  execSync(
    `npx prisma migrate deploy --schema ../../packages/db/prisma/schema.prisma`,
    {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      cwd: path.resolve(__dirname, '../../../../packages/db'),
      stdio: 'pipe',
    },
  );

  return databaseUrl;
}

export async function getTestPrisma(): Promise<PrismaClient> {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    await prisma.$connect();
  }
  return prisma;
}

export async function stopTestDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  if (container) {
    await container.stop();
    container = null;
  }
}

export async function cleanTestDatabase(): Promise<void> {
  if (!prisma) return;
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
}
