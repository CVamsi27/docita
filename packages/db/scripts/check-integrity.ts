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
  const checks: IntegrityCheck[] = [];

  const orphanedAppointmentRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Appointment" a
    LEFT JOIN "Patient" p ON p.id = a."patientId"
    LEFT JOIN "User" d ON d.id = a."doctorId"
    LEFT JOIN "Clinic" c ON c.id = a."clinicId"
    WHERE (a."patientId" IS NOT NULL AND p.id IS NULL)
       OR (a."doctorId" IS NOT NULL AND d.id IS NULL)
       OR (a."clinicId" IS NOT NULL AND c.id IS NULL)
  `;
  const orphanedAppointments = Number(orphanedAppointmentRows[0]?.count ?? 0n);
  checks.push({
    name: "No Orphaned Appointments",
    description:
      "All appointments have valid patient, doctor, and clinic references",
    passed: orphanedAppointments === 0,
    count: orphanedAppointments,
    details:
      orphanedAppointments > 0
        ? `Found ${orphanedAppointments} orphaned appointments`
        : undefined,
  });

  const orphanedPrescriptionRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Prescription" p
    LEFT JOIN "Patient" pa ON pa.id = p."patientId"
    LEFT JOIN "User" d ON d.id = p."doctorId"
    WHERE (p."patientId" IS NOT NULL AND pa.id IS NULL)
       OR (p."doctorId" IS NOT NULL AND d.id IS NULL)
  `;
  const orphanedPrescriptions = Number(
    orphanedPrescriptionRows[0]?.count ?? 0n,
  );
  checks.push({
    name: "No Orphaned Prescriptions",
    description: "All prescriptions have valid patient and doctor references",
    passed: orphanedPrescriptions === 0,
    count: orphanedPrescriptions,
    details:
      orphanedPrescriptions > 0
        ? `Found ${orphanedPrescriptions} orphaned prescriptions`
        : undefined,
  });

  const orphanedInvoiceRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Invoice" i
    LEFT JOIN "Patient" p ON p.id = i."patientId"
    WHERE i."patientId" IS NOT NULL
      AND p.id IS NULL
  `;
  const orphanedInvoices = Number(orphanedInvoiceRows[0]?.count ?? 0n);
  checks.push({
    name: "No Orphaned Invoices",
    description: "All invoices have valid patient references",
    passed: orphanedInvoices === 0,
    count: orphanedInvoices,
    details:
      orphanedInvoices > 0
        ? `Found ${orphanedInvoices} orphaned invoices`
        : undefined,
  });

  const patientsWithoutClinicRows = await prisma.$queryRaw<
    Array<{ count: bigint }>
  >`
    SELECT COUNT(*)::bigint AS count
    FROM "Patient" p
    LEFT JOIN "Clinic" c ON c.id = p."clinicId"
    WHERE p."clinicId" IS NOT NULL
      AND c.id IS NULL
  `;
  const patientsWithoutClinic = Number(
    patientsWithoutClinicRows[0]?.count ?? 0n,
  );
  checks.push({
    name: "All Patients Have Valid Clinic",
    description: "Every patient belongs to an existing clinic",
    passed: patientsWithoutClinic === 0,
    count: patientsWithoutClinic,
    details:
      patientsWithoutClinic > 0
        ? `Found ${patientsWithoutClinic} patients without valid clinic`
        : undefined,
  });

  const usersWithInvalidClinicRows = await prisma.$queryRaw<
    Array<{ count: bigint }>
  >`
    SELECT COUNT(*)::bigint AS count
    FROM "User" u
    LEFT JOIN "Clinic" c ON c.id = u."clinicId"
    WHERE u."clinicId" IS NOT NULL
      AND c.id IS NULL
  `;
  const usersWithInvalidClinic = Number(
    usersWithInvalidClinicRows[0]?.count ?? 0n,
  );
  checks.push({
    name: "All Users Have Valid Clinic",
    description: "Every user with a clinic ID has a valid clinic reference",
    passed: usersWithInvalidClinic === 0,
    count: usersWithInvalidClinic,
    details:
      usersWithInvalidClinic > 0
        ? `Found ${usersWithInvalidClinic} users with invalid clinic`
        : undefined,
  });

  const duplicateMrns = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM (
      SELECT mrn FROM "Patient" WHERE mrn IS NOT NULL GROUP BY mrn HAVING COUNT(*) > 1
    ) as duplicates
  `;
  const duplicateMrnCount = Number(duplicateMrns[0]?.count || 0);
  checks.push({
    name: "No Duplicate MRN",
    description: "All Medical Record Numbers are unique",
    passed: duplicateMrnCount === 0,
    count: duplicateMrnCount,
    details:
      duplicateMrnCount > 0
        ? `Found ${duplicateMrnCount} duplicate MRNs`
        : undefined,
  });

  const duplicateEmails = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM (
      SELECT email FROM "User" GROUP BY email HAVING COUNT(*) > 1
    ) as duplicates
  `;
  const duplicateEmailCount = Number(duplicateEmails[0]?.count || 0);
  checks.push({
    name: "No Duplicate User Emails",
    description: "All user emails are unique",
    passed: duplicateEmailCount === 0,
    count: duplicateEmailCount,
    details:
      duplicateEmailCount > 0
        ? `Found ${duplicateEmailCount} duplicate emails`
        : undefined,
  });

  const invalidAppointmentTimeRows = await prisma.$queryRaw<
    Array<{ count: bigint }>
  >`
    SELECT COUNT(*)::bigint AS count
    FROM "Appointment"
    WHERE "endTime" < "startTime"
  `;
  const invalidAppointmentTimes = Number(
    invalidAppointmentTimeRows[0]?.count ?? 0n,
  );
  checks.push({
    name: "Valid Appointment Times",
    description: "All appointments have end time after start time",
    passed: invalidAppointmentTimes === 0,
    count: invalidAppointmentTimes,
    details:
      invalidAppointmentTimes > 0
        ? `Found ${invalidAppointmentTimes} appointments with invalid times`
        : undefined,
  });

  try {
    const subscriptionsWithoutClinicRows = await prisma.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT COUNT(*)::bigint AS count
      FROM "Subscription" s
      LEFT JOIN "Clinic" c ON c.id = s."clinicId"
      WHERE s."clinicId" IS NOT NULL
        AND c.id IS NULL
    `;
    const subscriptionsWithoutClinic = Number(
      subscriptionsWithoutClinicRows[0]?.count ?? 0n,
    );
    checks.push({
      name: "All Subscriptions Have Valid Clinic",
      description: "Every subscription belongs to an existing clinic",
      passed: subscriptionsWithoutClinic === 0,
      count: subscriptionsWithoutClinic,
      details:
        subscriptionsWithoutClinic > 0
          ? `Found ${subscriptionsWithoutClinic} subscriptions without valid clinic`
          : undefined,
    });
  } catch {

  }

  const nullNameRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Patient"
    WHERE "firstName" IS NULL OR "lastName" IS NULL
  `;
  const patientsWithNullNames = Number(nullNameRows[0]?.count ?? 0n);
  checks.push({
    name: "No Null Patient Names",
    description: "All patients have first and last names",
    passed: patientsWithNullNames === 0,
    count: patientsWithNullNames,
    details:
      patientsWithNullNames > 0
        ? `Found ${patientsWithNullNames} patients with null names`
        : undefined,
  });

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
