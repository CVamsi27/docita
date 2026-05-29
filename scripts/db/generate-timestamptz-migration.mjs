#!/usr/bin/env node
/**
 * Generates SQL to migrate all Prisma DateTime columns from timestamp(3)
 * to timestamptz(3), preserving UTC instant semantics via AT TIME ZONE 'UTC'.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA = resolve(__dirname, "../../packages/db/prisma/schema.prisma");
const MIGRATION_DIR = resolve(
  __dirname,
  "../../packages/db/prisma/migrations/20260529120000_timestamptz_all_datetime",
);

const content = readFileSync(SCHEMA, "utf8");

/** @type {Map<string, string[]>} */
const tableFields = new Map();
let currentModel = null;
/** @type {string | null} */
let currentMap = null;

for (const line of content.split("\n")) {
  const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
  if (modelMatch) {
    currentModel = modelMatch[1];
    currentMap = null;
    continue;
  }
  if (line.trim() === "}" && currentModel) {
    currentModel = null;
    currentMap = null;
    continue;
  }
  if (!currentModel) continue;

  const mapMatch = line.match(/^\s*@@map\("([^"]+)"\)/);
  if (mapMatch) {
    currentMap = mapMatch[1];
    continue;
  }

  const fieldMatch = line.match(/^\s+(\w+)\s+DateTime/);
  if (!fieldMatch) continue;
  if (line.includes("@relation")) continue;

  const tableName = currentMap ?? currentModel;
  const fieldName = fieldMatch[1];
  if (!tableFields.has(tableName)) {
    tableFields.set(tableName, []);
  }
  tableFields.get(tableName).push(fieldName);
}

const alterStatements = [];
for (const [table, fields] of [...tableFields.entries()].sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  for (const field of fields.sort()) {
    alterStatements.push(
      `ALTER TABLE "${table}" ALTER COLUMN "${field}" TYPE timestamptz(3) USING "${field}" AT TIME ZONE 'UTC';`,
    );
  }
}

const sql = `-- Migrate all Prisma DateTime columns to timestamptz(3).
-- Existing values are UTC instants stored as naive timestamp digits.
-- AT TIME ZONE 'UTC' attaches UTC semantics before type change.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_no_active_overlap";

${alterStatements.join("\n")}

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_no_active_overlap"
EXCLUDE USING gist (
  "clinicId" WITH =,
  "doctorId" WITH =,
  tstzrange("startTime", "endTime") WITH &&
)
WHERE (status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'));
`;

mkdirSync(MIGRATION_DIR, { recursive: true });
writeFileSync(resolve(MIGRATION_DIR, "migration.sql"), sql, "utf8");

const totalFields = alterStatements.length;
console.log(
  `Generated migration with ${totalFields} column alters across ${tableFields.size} tables`,
);
console.log(`Written to ${MIGRATION_DIR}/migration.sql`);
