import prisma from "./prisma-script-client";
import { Prisma } from "@prisma/client";

type Mode = "pre" | "post";

type QueryValue = bigint | number | string | boolean | Date | null;
type CountRow = { count: QueryValue };
type VersionColumnRow = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
};
type VersionStatsRow = {
  total: QueryValue;
  null_versions: QueryValue;
  min_version: QueryValue;
};
type IndexRow = { indexname: string };
type ConstraintRow = { conname: string; contype: string };
type MigrationRow = {
  migration_name: string;
  finished: boolean;
  rolled_back: boolean;
};
type RegclassRow = { exists: string | null };
type ColumnRow = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
};
type NullCountRow = { null_count: QueryValue };

const TRACKED_VERSION_TABLES = [
  "DoctorTimeOff",
  "Prescription",
  "MedicationDose",
  "StaffLeave",
] as const;

const CURRENT_MIGRATIONS = [
  "20260527100000_add_optimistic_lock_versions",
  "20260527100100_add_outbox_event",
  "20260527101000_main_feature_audit_remediation",
] as const;

const INVOICE_CENTS_COLUMNS = [
  "totalCents",
  "subtotalCents",
  "discountTotalCents",
  "taxTotalCents",
  "grandTotalCents",
] as const;

const REQUIRED_OUTBOX_INDEXES = new Set([
  "OutboxEvent_pkey",
  "OutboxEvent_idempotencyKey_key",
  "OutboxEvent_processedAt_createdAt_idx",
  "OutboxEvent_clinicId_idx",
  "OutboxEvent_eventName_idx",
]);

function readMode(): Mode {
  const value = process.argv.filter((arg) => arg !== "--")[2] ?? "post";
  if (value === "pre" || value === "post") return value;
  throw new Error("Usage: pnpm db:prod-data-safety -- <pre|post>");
}

function toNumber(value: QueryValue): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  return 0;
}

async function countRows(tableName: (typeof TRACKED_VERSION_TABLES)[number]) {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(
    `SELECT COUNT(*)::bigint AS count FROM "${tableName}"`,
  );
  return toNumber(rows[0]?.count ?? 0);
}

async function getVersionColumn(tableName: string) {
  const rows = await prisma.$queryRaw<VersionColumnRow[]>`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = 'version'
  `;
  return rows[0] ?? null;
}

async function getVersionStats(
  tableName: (typeof TRACKED_VERSION_TABLES)[number],
) {
  const rows = await prisma.$queryRawUnsafe<VersionStatsRow[]>(
    `SELECT COUNT(*)::bigint AS total,
            COUNT(*) FILTER (WHERE "version" IS NULL)::bigint AS null_versions,
            COALESCE(MIN("version"), 0)::int AS min_version
       FROM "${tableName}"`,
  );
  const row = rows[0];
  return {
    total: toNumber(row?.total ?? 0),
    nullVersions: toNumber(row?.null_versions ?? 0),
    minVersion: toNumber(row?.min_version ?? 0),
  };
}

async function getCurrentMigrationStatus() {
  return prisma.$queryRaw<MigrationRow[]>(Prisma.sql`
    SELECT migration_name,
           finished_at IS NOT NULL AS finished,
           rolled_back_at IS NOT NULL AS rolled_back
    FROM "_prisma_migrations"
    WHERE migration_name IN (${Prisma.join(CURRENT_MIGRATIONS)})
    ORDER BY migration_name
  `);
}

async function getColumn(tableName: string, columnName: string) {
  const rows = await prisma.$queryRaw<ColumnRow[]>`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = ${columnName}
  `;
  return rows[0] ?? null;
}

async function countNulls(tableName: string, columnName: string) {
  const rows = await prisma.$queryRawUnsafe<NullCountRow[]>(
    `SELECT COUNT(*)::bigint AS null_count FROM "${tableName}" WHERE "${columnName}" IS NULL`,
  );
  return toNumber(rows[0]?.null_count ?? 0);
}

async function outboxTableExists() {
  const rows = await prisma.$queryRaw<RegclassRow[]>`
    SELECT to_regclass('public."OutboxEvent"')::text AS exists
  `;
  return rows[0]?.exists?.includes("OutboxEvent") ?? false;
}

async function getOutboxIndexes() {
  const rows = await prisma.$queryRaw<IndexRow[]>`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'OutboxEvent'
    ORDER BY indexname
  `;
  return rows.map((row) => row.indexname);
}

async function getOutboxConstraints() {
  const exists = await outboxTableExists();
  if (!exists) return [];

  const rows = await prisma.$queryRaw<ConstraintRow[]>`
    SELECT conname, contype::text AS contype
    FROM pg_constraint
    WHERE conrelid = 'public."OutboxEvent"'::regclass
    ORDER BY conname
  `;
  return rows;
}

async function main() {
  const mode = readMode();
  const failures: string[] = [];
  const rowCounts: Record<string, number> = {};
  const versionColumns: Record<string, VersionColumnRow | null> = {};
  const versionStats: Record<
    string,
    { total: number; nullVersions: number; minVersion: number } | null
  > = {};
  const invoiceCents: Record<
    string,
    { column: ColumnRow | null; nullRows: number | null }
  > = {};

  for (const table of TRACKED_VERSION_TABLES) {
    rowCounts[table] = await countRows(table);
    const column = await getVersionColumn(table);
    versionColumns[table] = column;

    if (mode === "post") {
      if (!column) {
        failures.push(`${table}.version column is missing`);
        versionStats[table] = null;
        continue;
      }
      if (column.is_nullable !== "NO") {
        failures.push(`${table}.version must be NOT NULL`);
      }
      if (!column.column_default?.includes("1")) {
        failures.push(`${table}.version must default to 1`);
      }

      const stats = await getVersionStats(table);
      versionStats[table] = stats;
      if (stats.nullVersions !== 0) {
        failures.push(
          `${table}.version contains ${stats.nullVersions} NULL rows`,
        );
      }
      if (stats.total > 0 && stats.minVersion < 1) {
        failures.push(`${table}.version contains values below 1`);
      }
    }
  }

  const migrations = await getCurrentMigrationStatus();
  for (const columnName of INVOICE_CENTS_COLUMNS) {
    const column = await getColumn("Invoice", columnName);
    invoiceCents[columnName] = {
      column,
      nullRows:
        mode === "post" && column
          ? await countNulls("Invoice", columnName)
          : null,
    };
  }
  const outbox = {
    exists: await outboxTableExists(),
    indexes: await getOutboxIndexes(),
    constraints: await getOutboxConstraints(),
  };

  if (mode === "post") {
    for (const migration of CURRENT_MIGRATIONS) {
      const row = migrations.find((item) => item.migration_name === migration);
      if (!row?.finished || row.rolled_back) {
        failures.push(`${migration} is not marked as successfully applied`);
      }
    }

    for (const [columnName, evidence] of Object.entries(invoiceCents)) {
      if (!evidence.column) {
        failures.push(`Invoice.${columnName} column is missing`);
        continue;
      }
      if (evidence.column.is_nullable !== "NO") {
        failures.push(`Invoice.${columnName} must be NOT NULL`);
      }
      if (!evidence.column.column_default?.includes("0")) {
        failures.push(`Invoice.${columnName} must default to 0`);
      }
      if (evidence.nullRows !== 0) {
        failures.push(
          `Invoice.${columnName} contains ${evidence.nullRows} NULL rows`,
        );
      }
    }

    if (!outbox.exists) {
      failures.push("OutboxEvent table is missing");
    }
    for (const indexName of REQUIRED_OUTBOX_INDEXES) {
      if (!outbox.indexes.includes(indexName)) {
        failures.push(`OutboxEvent index/constraint ${indexName} is missing`);
      }
    }
  }

  const report = {
    status: failures.length === 0 ? "PASSED" : "FAILED",
    mode,
    generatedAt: new Date().toISOString(),
    note: "Non-PHI production data safety evidence. Counts and metadata only.",
    rowCounts,
    versionColumns,
    versionStats,
    invoiceCents,
    migrations,
    outbox,
    failures,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (failures.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown data safety check error";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    return prisma.$disconnect();
  });
