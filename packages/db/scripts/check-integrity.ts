import type { PrismaClient } from "@prisma/client";
import prisma from "./prisma-script-client";

interface IntegrityCheck {
  name: string;
  description: string;
  passed: boolean;
  details?: string;
  count?: number;
}

interface IntegrityReport {
  timestamp: Date;
  checks: IntegrityCheck[];
  totalPassed: number;
  totalFailed: number;
  status: "PASSED" | "FAILED" | "WARNING";
}

export async function runIntegrityChecks(
  prisma: PrismaClient,
): Promise<IntegrityReport> {
  const checks = await Promise.all([
    checkOrphanedAppointments(prisma),
    checkOrphanedPrescriptions(prisma),
    checkOrphanedInvoices(prisma),
    checkPatientsWithoutClinic(prisma),
    checkUsersWithInvalidClinic(prisma),
    checkClinicUsersWithIncompleteOnboarding(prisma),
    checkDuplicateMrns(prisma),
    checkDuplicateEmails(prisma),
    checkInvalidAppointmentTimes(prisma),
    checkSubscriptionsWithoutClinic(prisma),
    checkSubscriptionQuotaDrift(prisma),
    checkClinicTierMatchesSubscription(prisma),
    checkClinicStatusMatchesSubscription(prisma),
    checkPatientsWithNullNames(prisma),
  ]);

  return buildIntegrityReport(checks);
}

async function checkOrphanedAppointments(
  prisma: PrismaClient,
): Promise<IntegrityCheck> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Appointment" a
    LEFT JOIN "Patient" p ON p.id = a."patientId"
    LEFT JOIN "User" d ON d.id = a."doctorId"
    LEFT JOIN "Clinic" c ON c.id = a."clinicId"
    WHERE (a."patientId" IS NOT NULL AND p.id IS NULL)
       OR (a."doctorId" IS NOT NULL AND d.id IS NULL)
       OR (a."clinicId" IS NOT NULL AND c.id IS NULL)
  `;
  const count = getQueryCount(rows);
  return createCountCheck({
    name: "No Orphaned Appointments",
    description:
      "All appointments have valid patient, doctor, and clinic references",
    count,
    detail: `Found ${count} orphaned appointments`,
  });
}

async function checkOrphanedPrescriptions(
  prisma: PrismaClient,
): Promise<IntegrityCheck> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Prescription" p
    LEFT JOIN "Patient" pa ON pa.id = p."patientId"
    LEFT JOIN "User" d ON d.id = p."doctorId"
    WHERE (p."patientId" IS NOT NULL AND pa.id IS NULL)
       OR (p."doctorId" IS NOT NULL AND d.id IS NULL)
  `;
  const count = getQueryCount(rows);
  return createCountCheck({
    name: "No Orphaned Prescriptions",
    description: "All prescriptions have valid patient and doctor references",
    count,
    detail: `Found ${count} orphaned prescriptions`,
  });
}

async function checkOrphanedInvoices(
  prisma: PrismaClient,
): Promise<IntegrityCheck> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Invoice" i
    LEFT JOIN "Patient" p ON p.id = i."patientId"
    WHERE i."patientId" IS NOT NULL
      AND p.id IS NULL
  `;
  const count = getQueryCount(rows);
  return createCountCheck({
    name: "No Orphaned Invoices",
    description: "All invoices have valid patient references",
    count,
    detail: `Found ${count} orphaned invoices`,
  });
}

async function checkPatientsWithoutClinic(
  prisma: PrismaClient,
): Promise<IntegrityCheck> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Patient" p
    LEFT JOIN "Clinic" c ON c.id = p."clinicId"
    WHERE p."clinicId" IS NOT NULL
      AND c.id IS NULL
  `;
  const count = getQueryCount(rows);
  return createCountCheck({
    name: "All Patients Have Valid Clinic",
    description: "Every patient belongs to an existing clinic",
    count,
    detail: `Found ${count} patients without valid clinic`,
  });
}

async function checkUsersWithInvalidClinic(
  prisma: PrismaClient,
): Promise<IntegrityCheck> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "User" u
    LEFT JOIN "Clinic" c ON c.id = u."clinicId"
    WHERE u."clinicId" IS NOT NULL
      AND c.id IS NULL
  `;
  const count = getQueryCount(rows);
  return createCountCheck({
    name: "All Users Have Valid Clinic",
    description: "Every user with a clinic ID has a valid clinic reference",
    count,
    detail: `Found ${count} users with invalid clinic`,
  });
}

async function checkClinicUsersWithIncompleteOnboarding(
  prisma: PrismaClient,
): Promise<IntegrityCheck> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "User"
    WHERE "clinicId" IS NOT NULL
      AND (
        "onboardingStep" IS DISTINCT FROM 'COMPLETED'
        OR "onboardingCompletedAt" IS NULL
      )
  `;
  const count = getQueryCount(rows);
  return createCountCheck({
    name: "Clinic Users Stay Out Of Onboarding",
    description: "Every clinic-associated user has completed onboarding state",
    count,
    detail: `Found ${count} clinic users with incomplete onboarding state`,
  });
}

async function checkDuplicateMrns(prisma: PrismaClient): Promise<IntegrityCheck> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM (
      SELECT "clinicId", mrn
      FROM "Patient"
      WHERE mrn IS NOT NULL
      GROUP BY "clinicId", mrn
      HAVING COUNT(*) > 1
    ) as duplicates
  `;
  const count = getQueryCount(rows);
  return createCountCheck({
    name: "No Duplicate MRN Per Clinic",
    description: "Medical Record Numbers are unique inside each clinic",
    count,
    detail: `Found ${count} duplicate MRNs`,
  });
}

async function checkDuplicateEmails(
  prisma: PrismaClient,
): Promise<IntegrityCheck> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM (
      SELECT email FROM "User" GROUP BY email HAVING COUNT(*) > 1
    ) as duplicates
  `;
  const count = getQueryCount(rows);
  return createCountCheck({
    name: "No Duplicate User Emails",
    description: "All user emails are unique",
    count,
    detail: `Found ${count} duplicate emails`,
  });
}

async function checkInvalidAppointmentTimes(
  prisma: PrismaClient,
): Promise<IntegrityCheck> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Appointment"
    WHERE "endTime" < "startTime"
  `;
  const count = getQueryCount(rows);
  return createCountCheck({
    name: "Valid Appointment Times",
    description: "All appointments have end time after start time",
    count,
    detail: `Found ${count} appointments with invalid times`,
  });
}

async function checkSubscriptionsWithoutClinic(
  prisma: PrismaClient,
): Promise<IntegrityCheck> {
  try {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Subscription" s
      LEFT JOIN "Clinic" c ON c.id = s."clinicId"
      WHERE s."clinicId" IS NOT NULL
        AND c.id IS NULL
    `;
    const count = getQueryCount(rows);
    return createCountCheck({
      name: "All Subscriptions Have Valid Clinic",
      description: "Every subscription belongs to an existing clinic",
      count,
      detail: `Found ${count} subscriptions without valid clinic`,
    });
  } catch (error) {
    return {
      name: "All Subscriptions Have Valid Clinic",
      description: "Every subscription belongs to an existing clinic",
      passed: false,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkSubscriptionQuotaDrift(
  prisma: PrismaClient,
): Promise<IntegrityCheck> {
  try {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Subscription" s
      JOIN "TierPricing" tp ON tp.tier = s.plan
      WHERE s."includedPatients" <> tp."includedPatients"
         OR s."includedAppointments" <> tp."includedAppointments"
         OR s."includedStorageGB" <> tp."includedStorageGB"
         OR s."includedUsers" <> tp."includedUsers"
    `;
    const count = getQueryCount(rows);
    return createCountCheck({
      name: "Subscription Quotas Match Tier Catalog",
      description:
        "Every subscription carries the quota columns published by TierPricing for its plan",
      count,
      detail: `Found ${count} subscriptions with catalog-divergent quotas`,
    });
  } catch (error) {
    return {
      name: "Subscription Quotas Match Tier Catalog",
      description:
        "Every subscription carries the quota columns published by TierPricing for its plan",
      passed: false,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkClinicTierMatchesSubscription(
  prisma: PrismaClient,
): Promise<IntegrityCheck> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Clinic" c
    JOIN "Subscription" s ON s."clinicId" = c.id
    WHERE c.tier <> s.plan
  `;
  const count = getQueryCount(rows);
  return createCountCheck({
    name: "Clinic Tier Matches Subscription",
    description:
      "Feature gating reads Clinic.tier while billing reads Subscription.plan; both must agree",
    count,
    detail: `Found ${count} clinics whose tier differs from their subscription plan`,
  });
}

async function checkClinicStatusMatchesSubscription(
  prisma: PrismaClient,
): Promise<IntegrityCheck> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Clinic" c
    JOIN "Subscription" s ON s."clinicId" = c.id
    WHERE c."subscriptionStatus" <> s.status
  `;
  const count = getQueryCount(rows);
  return createCountCheck({
    name: "Clinic Status Matches Subscription",
    description:
      "Access guards read Clinic.subscriptionStatus, so it must mirror the subscription status",
    count,
    detail: `Found ${count} clinics whose status differs from their subscription status`,
  });
}

async function checkPatientsWithNullNames(
  prisma: PrismaClient,
): Promise<IntegrityCheck> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Patient"
    WHERE "firstName" IS NULL OR "lastName" IS NULL
  `;
  const count = getQueryCount(rows);
  return createCountCheck({
    name: "No Null Patient Names",
    description: "All patients have first and last names",
    count,
    detail: `Found ${count} patients with null names`,
  });
}

function buildIntegrityReport(checks: IntegrityCheck[]): IntegrityReport {
  const totalPassed = checks.filter((c) => c.passed).length;
  const totalFailed = checks.filter((c) => !c.passed).length;

  let status: IntegrityReport["status"] = "PASSED";
  if (totalFailed > 0) {
    status = totalFailed > 2 ? "FAILED" : "WARNING";
  }

  return {
    timestamp: new Date(),
    checks,
    totalPassed,
    totalFailed,
    status,
  };
}

function createCountCheck(params: {
  name: string;
  description: string;
  count: number;
  detail: string;
}): IntegrityCheck {
  return {
    name: params.name,
    description: params.description,
    passed: params.count === 0,
    count: params.count,
    details: params.count > 0 ? params.detail : undefined,
  };
}

function getQueryCount(rows: Array<{ count: bigint }>): number {
  return Number(rows[0]?.count ?? 0n);
}

export function formatIntegrityReport(report: IntegrityReport): string {
  const lines: string[] = [
    "═══════════════════════════════════════════════════════════════",
    "                  DATA INTEGRITY REPORT",
    "═══════════════════════════════════════════════════════════════",
    `Timestamp: ${report.timestamp.toISOString()}`,
    `Status: ${report.status}`,
    `Passed: ${report.totalPassed}/${report.checks.length}`,
    "",
    "Checks:",
    "───────────────────────────────────────────────────────────────",
  ];

  for (const check of report.checks) {
    const icon = check.passed ? "" : "";
    lines.push(`${icon} ${check.name}`);
    lines.push(`   ${check.description}`);
    if (check.details) {
      lines.push(`     ${check.details}`);
    }
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

if (require.main === module) {
  runIntegrityChecks(prisma)
    .then((report) => {
      process.stdout.write(`${formatIntegrityReport(report)}\n`);
      process.exit(report.status === "FAILED" ? 1 : 0);
    })
    .catch((error) => {
      const message =
        error instanceof Error ? error.message : "Unknown integrity check error";
      process.stderr.write(`${message}\n`);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
