

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  const standardMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (standardMatch) {
    const systolic = parseInt(standardMatch[1], 10);
    const diastolic = parseInt(standardMatch[2], 10);

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

  const rangeMatch = trimmed.match(
    /^(\d+)\s*-\s*(\d+)\s*\/\s*(\d+)\s*-\s*(\d+)$/,
  );
  if (rangeMatch) {

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

  const singleNumberMatch = trimmed.match(/^(\d+)$/);
  if (singleNumberMatch) {
    return {
      systolic: parseInt(singleNumberMatch[1], 10),
      diastolic: null,
      status: "FLAGGED",
      reason: `Single value "${trimmed}" - missing diastolic`,
    };
  }

  return {
    systolic: null,
    diastolic: null,
    status: "FLAGGED",
    reason: `Unknown format: "${trimmed}"`,
  };
}

async function migrateBloodPressure(dryRun: boolean = false): Promise<void> {

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

  if (flaggedCount > 0) {

    const flaggedResults = results.filter((r) => r.status === "FLAGGED");
    for (const result of flaggedResults) {

      

    }
  }

  const migratedResults = results
    .filter((r) => r.status === "MIGRATED")
    .slice(0, 5);
  if (migratedResults.length > 0) {

    for (const result of migratedResults) {

      

    }
  }

  if (dryRun) {

  } else {

  }
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

migrateBloodPressure(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
