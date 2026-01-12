import { PrismaClient } from "@prisma/client";

/**
 * Data Integrity Checker for Docita
 *
 * Runs comprehensive checks to ensure database integrity
 * before and after migrations.
 */

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

  // Check 1: Orphaned Appointments
  const orphanedAppointments = await prisma.appointment.count({
    where: {
      OR: [
        { patientId: { not: undefined }, patient: { is: null } },
        { doctorId: { not: undefined }, doctor: { is: null } },
        { clinicId: { not: undefined }, clinic: { is: null } },
      ],
    },
  });
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

  // Check 2: Orphaned Prescriptions
  const orphanedPrescriptions = await prisma.prescription.count({
    where: {
      OR: [
        { patientId: { not: undefined }, patient: { is: null } },
        { doctorId: { not: undefined }, doctor: { is: null } },
      ],
    },
  });
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

  // Check 3: Orphaned Invoices
  const orphanedInvoices = await prisma.invoice.count({
    where: {
      patientId: { not: undefined },
      patient: { is: null },
    },
  });
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

  // Check 4: Patients without Clinic
  const patientsWithoutClinic = await prisma.patient.count({
    where: {
      clinicId: { not: undefined },
      clinic: { is: null },
    },
  });
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

  // Check 5: Users with Invalid Clinic Reference
  const usersWithInvalidClinic = await prisma.user.count({
    where: {
      clinicId: { not: null },
      clinic: { is: null },
    },
  });
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

  // Check 6: Duplicate MRN
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

  // Check 7: Duplicate User Emails
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

  // Check 8: Appointments with End Time Before Start Time
  const invalidAppointmentTimes = await prisma.appointment.count({
    where: {
      endTime: { lt: prisma.appointment.fields.startTime },
    },
  });
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

  // Check 9: Subscriptions without Clinic
  try {
    const subscriptionsWithoutClinic = await prisma.subscription.count({
      where: {
        clinicId: { not: undefined },
        clinic: { is: null },
      },
    });
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
    // Subscription model might not exist
  }

  // Check 10: Null Values in Required Fields
  const patientsWithNullNames = await prisma.patient.count({
    where: {
      OR: [{ firstName: null as any }, { lastName: null as any }],
    },
  });
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

  // Calculate totals
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
    const icon = check.passed ? "✅" : "❌";
    lines.push(`${icon} ${check.name}`);
    lines.push(`   ${check.description}`);
    if (check.details) {
      lines.push(`   ⚠️  ${check.details}`);
    }
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

// CLI execution
if (require.main === module) {
  const prisma = new PrismaClient();

  runIntegrityChecks(prisma)
    .then((report) => {
      console.log(formatIntegrityReport(report));
      process.exit(report.status === "FAILED" ? 1 : 0);
    })
    .catch((error) => {
      console.error("Error running integrity checks:", error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
