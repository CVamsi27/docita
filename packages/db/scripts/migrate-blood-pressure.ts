/**
 * Blood Pressure Migration Script
 *
 * This script migrates legacy blood pressure data from the string format "120/80"
 * to separate systolic/diastolic integer fields for hospital-grade accuracy.
 *
 * Migration Strategy:
 * 1. Parse standard format "XXX/YY" into systolic and diastolic values
 * 2. Flag non-standard entries (ranges, text, invalid values) for manual review
 * 3. Validate parsed values are within clinically reasonable ranges
 *
 * Usage:
 *   npx tsx packages/db/scripts/migrate-blood-pressure.ts [--dry-run]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Clinically reasonable ranges for blood pressure
const BP_RANGES = {
  systolic: { min: 60, max: 300 },
  diastolic: { min: 30, max: 200 },
};

interface MigrationResult {
  id: string;
  originalValue: string;
  systolicBP: number | null;
  diastolicBP: number | null;
  status: "MIGRATED" | "FLAGGED";
  reason?: string;
}

/**
 * Parse blood pressure string into systolic and diastolic values
 */
function parseBloodPressure(bp: string): {
  systolic: number | null;
  diastolic: number | null;
  status: "MIGRATED" | "FLAGGED";
  reason?: string;
} {
  if (!bp || typeof bp !== "string") {
    return {
      systolic: null,
      diastolic: null,
      status: "FLAGGED",
      reason: "Empty or invalid value",
    };
  }

  const trimmed = bp.trim();

  // Standard format: "120/80" or "120 / 80"
  const standardMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (standardMatch) {
    const systolic = parseInt(standardMatch[1], 10);
    const diastolic = parseInt(standardMatch[2], 10);

    // Validate ranges
    if (
      systolic < BP_RANGES.systolic.min ||
      systolic > BP_RANGES.systolic.max
    ) {
      return {
        systolic,
        diastolic,
        status: "FLAGGED",
        reason: `Systolic value ${systolic} out of range (${BP_RANGES.systolic.min}-${BP_RANGES.systolic.max})`,
      };
    }

    if (
      diastolic < BP_RANGES.diastolic.min ||
      diastolic > BP_RANGES.diastolic.max
    ) {
      return {
        systolic,
        diastolic,
        status: "FLAGGED",
        reason: `Diastolic value ${diastolic} out of range (${BP_RANGES.diastolic.min}-${BP_RANGES.diastolic.max})`,
      };
    }

    // Validate systolic > diastolic
    if (systolic <= diastolic) {
      return {
        systolic,
        diastolic,
        status: "FLAGGED",
        reason: `Systolic (${systolic}) should be greater than diastolic (${diastolic})`,
      };
    }

    return { systolic, diastolic, status: "MIGRATED" };
  }

  // Range format: "120-130/80-90" or "120-130 / 80-90"
  const rangeMatch = trimmed.match(
    /^(\d+)\s*-\s*(\d+)\s*\/\s*(\d+)\s*-\s*(\d+)$/,
  );
  if (rangeMatch) {
    // Use average of range for migration, but flag for review
    const systolicAvg = Math.round(
      (parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2,
    );
    const diastolicAvg = Math.round(
      (parseInt(rangeMatch[3], 10) + parseInt(rangeMatch[4], 10)) / 2,
    );
    return {
      systolic: systolicAvg,
      diastolic: diastolicAvg,
      status: "FLAGGED",
      reason: `Range value "${trimmed}" converted to average ${systolicAvg}/${diastolicAvg}`,
    };
  }

  // Systolic range only: "140-150/90"
  const systolicRangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)\s*\/\s*(\d+)$/);
  if (systolicRangeMatch) {
    const systolicAvg = Math.round(
      (parseInt(systolicRangeMatch[1], 10) +
        parseInt(systolicRangeMatch[2], 10)) /
        2,
    );
    const diastolic = parseInt(systolicRangeMatch[3], 10);
    return {
      systolic: systolicAvg,
      diastolic,
      status: "FLAGGED",
      reason: `Systolic range "${trimmed}" converted to average ${systolicAvg}/${diastolic}`,
    };
  }

  // Text-based entries
  const textPatterns = [
    /normal/i,
    /high/i,
    /low/i,
    /elevated/i,
    /hypertension/i,
    /hypotension/i,
    /not\s*taken/i,
    /n\/?a/i,
    /refused/i,
  ];

  for (const pattern of textPatterns) {
    if (pattern.test(trimmed)) {
      return {
        systolic: null,
        diastolic: null,
        status: "FLAGGED",
        reason: `Text-based entry: "${trimmed}"`,
      };
    }
  }

  // Single number (could be systolic only)
  const singleNumberMatch = trimmed.match(/^(\d+)$/);
  if (singleNumberMatch) {
    return {
      systolic: parseInt(singleNumberMatch[1], 10),
      diastolic: null,
      status: "FLAGGED",
      reason: `Single value "${trimmed}" - missing diastolic`,
    };
  }

  // Unknown format
  return {
    systolic: null,
    diastolic: null,
    status: "FLAGGED",
    reason: `Unknown format: "${trimmed}"`,
  };
}

async function migrateBloodPressure(dryRun: boolean = false): Promise<void> {
  console.log("=".repeat(60));
  console.log("Blood Pressure Migration Script");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes will be made)" : "LIVE"}`);
  console.log("=".repeat(60));
  console.log("");

  // Fetch all vital signs with legacy bloodPressure field
  // Using raw query to handle fields that may not exist in older schema
  const vitalSigns = await prisma.$queryRaw<
    Array<{
      id: string;
      bloodPressure: string | null;
      appointmentId: string;
      systolicBP: number | null;
    }>
  >`
    SELECT id, "bloodPressure", "appointmentId", "systolicBP"
    FROM "VitalSign"
    WHERE "bloodPressure" IS NOT NULL
    AND ("systolicBP" IS NULL OR "bpMigrationStatus" IS NULL)
  `;

  console.log(`Found ${vitalSigns.length} vital sign records to process`);
  console.log("");

  const results: MigrationResult[] = [];
  let migratedCount = 0;
  let flaggedCount = 0;

  for (const vital of vitalSigns) {
    if (!vital.bloodPressure) continue;

    const parsed = parseBloodPressure(vital.bloodPressure);

    results.push({
      id: vital.id,
      originalValue: vital.bloodPressure,
      systolicBP: parsed.systolic,
      diastolicBP: parsed.diastolic,
      status: parsed.status,
      reason: parsed.reason,
    });

    if (parsed.status === "MIGRATED") {
      migratedCount++;
    } else {
      flaggedCount++;
    }

    if (!dryRun) {
      // Use raw query for update to handle new fields
      await prisma.$executeRaw`
        UPDATE "VitalSign"
        SET 
          "systolicBP" = ${parsed.systolic},
          "diastolicBP" = ${parsed.diastolic},
          "bpMigrationStatus" = ${parsed.status}::"BpMigrationStatus"
        WHERE id = ${vital.id}
      `;
    }
  }

  // Summary
  console.log("=".repeat(60));
  console.log("MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total records processed: ${vitalSigns.length}`);
  console.log(`Successfully migrated:   ${migratedCount}`);
  console.log(`Flagged for review:      ${flaggedCount}`);
  console.log("");

  // Print flagged records for review
  if (flaggedCount > 0) {
    console.log("=".repeat(60));
    console.log("FLAGGED RECORDS (require manual review)");
    console.log("=".repeat(60));

    const flaggedResults = results.filter((r) => r.status === "FLAGGED");
    for (const result of flaggedResults) {
      console.log(`ID: ${result.id}`);
      console.log(`  Original: "${result.originalValue}"`);
      console.log(
        `  Parsed:   ${result.systolicBP ?? "null"}/${result.diastolicBP ?? "null"}`,
      );
      console.log(`  Reason:   ${result.reason}`);
      console.log("");
    }
  }

  // Print sample migrated records
  const migratedResults = results
    .filter((r) => r.status === "MIGRATED")
    .slice(0, 5);
  if (migratedResults.length > 0) {
    console.log("=".repeat(60));
    console.log("SAMPLE MIGRATED RECORDS");
    console.log("=".repeat(60));

    for (const result of migratedResults) {
      console.log(`ID: ${result.id}`);
      console.log(
        `  "${result.originalValue}" → ${result.systolicBP}/${result.diastolicBP}`,
      );
      console.log("");
    }
  }

  if (dryRun) {
    console.log("=".repeat(60));
    console.log("DRY RUN COMPLETE - No changes were made to the database");
    console.log("Run without --dry-run to apply changes");
    console.log("=".repeat(60));
  } else {
    console.log("=".repeat(60));
    console.log("MIGRATION COMPLETE");
    console.log("=".repeat(60));
  }
}

// CLI execution
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

migrateBloodPressure(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
