import { AppointmentStatus } from "@prisma/client";
import prisma from "./prisma-script-client";

/**
 * Backfill active `PatientDoctor` rows from appointment history.
 *
 * `PatientDoctor` rows are never written by the production request path today
 * (the model is read by `PatientDoctorGuard`, which is registered but applied
 * to no live route). C1 phase-2 flips `resource.requiresAssignment` to `true`
 * on the staff patients surface, so existing doctor-patient relationships
 * must be represented or every DOCTOR loses object-level access to every
 * patient they have ever seen (AGENTS §9.4).
 *
 * Insert-only and idempotent: an existing active row for the same
 * (patientId, doctorId) is left untouched. Cancelled appointments are
 * excluded so an accidental booking does not create an assignment.
 *
 * Usage:
 *   pnpm --filter @workspace/db exec ts-node scripts/backfill-patient-doctor.ts          # dry-run
 *   pnpm --filter @workspace/db exec ts-node scripts/backfill-patient-doctor.ts --apply  # write
 */

const EXCLUDED_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
];

async function collectCandidatePairs() {
  const appointments = await prisma.appointment.findMany({
    where: { status: { notIn: EXCLUDED_STATUSES } },
    select: {
      patientId: true,
      doctorId: true,
      clinicId: true,
      startTime: true,
    },
  });

  const byPair = new Map<
    string,
    {
      patientId: string;
      doctorId: string;
      clinicId: string;
      first: Date;
      last: Date;
    }
  >();

  for (const appointment of appointments) {
    const key = `${appointment.patientId}:${appointment.doctorId}`;
    const existing = byPair.get(key);
    if (!existing) {
      byPair.set(key, {
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        clinicId: appointment.clinicId,
        first: appointment.startTime,
        last: appointment.startTime,
      });
    } else {
      if (appointment.startTime < existing.first)
        existing.first = appointment.startTime;
      if (appointment.startTime > existing.last)
        existing.last = appointment.startTime;
    }
  }

  return [...byPair.values()];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const pairs = await collectCandidatePairs();
  console.log(`Candidate distinct (patientId, doctorId) pairs: ${pairs.length}`);

  const existing = await prisma.patientDoctor.findMany({
    where: { isActive: true },
    select: { patientId: true, doctorId: true },
  });
  const existingKeys = new Set(
    existing.map((row) => `${row.patientId}:${row.doctorId}`),
  );

  const toInsert = pairs.filter(
    (pair) => !existingKeys.has(`${pair.patientId}:${pair.doctorId}`),
  );

  console.log(`Already active: ${pairs.length - toInsert.length}`);
  console.log(`To insert: ${toInsert.length}`);

  if (!apply) {
    console.log("Dry-run — pass --apply to write.");
    for (const row of toInsert.slice(0, 20)) {
      console.log(
        `  would insert patient=${row.patientId} doctor=${row.doctorId} clinic=${row.clinicId} firstSeen=${row.first.toISOString()}`,
      );
    }
    if (toInsert.length > 20)
      console.log(`  ... and ${toInsert.length - 20} more`);
    return;
  }

  let inserted = 0;
  for (const row of toInsert) {
    await prisma.patientDoctor.create({
      data: {
        patientId: row.patientId,
        doctorId: row.doctorId,
        clinicId: row.clinicId,
        isActive: true,
        firstSeenAt: row.first,
        lastSeenAt: row.last,
      },
    });
    inserted += 1;
  }
  console.log(`Inserted ${inserted} PatientDoctor rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
