import { AppointmentStatus, FollowUpStatus, PrismaClient } from '@workspace/db';
import {
  RAJESH_APPOINTMENT_ID,
  RAJESH_INVOICE_ID,
  RAJESH_PRESCRIPTION_ID,
  seedPatientPhone,
} from './seed-constants';
import { dateOffset, withTime } from './seed-date-helpers';
import {
  SEEDED_PATIENTS,
  getSeedDocumentPlans,
  type SeedEntityRef,
} from './seed-patient-factory';
import { buildAppointmentPlans } from './seed-encounter-factory';
import {
  CHIEF_COMPLAINTS,
  CLINICAL_IMPRESSIONS,
  CONSULTATION_NOTES,
  DIAGNOSIS_NOTES,
  FOLLOW_UP_REASONS,
  HPI_TEMPLATES,
  MEDICATION_TEMPLATES,
  SEED_ICD_CODES,
  TREATMENT_PLANS,
  buildSeedVitals,
} from './seed-clinical-rule-factory';
import {
  SEED_INVOICE_FINANCIAL_YEAR,
  SEED_INVOICE_PREFIX,
  getSeedInvoiceData,
} from './seed-invoice-factory';

// Re-export the Rajesh trio from their new contract home (seed-constants) so
// seed-pdfs.ts and any other existing importer of this module keeps compiling.
export { RAJESH_APPOINTMENT_ID, RAJESH_INVOICE_ID, RAJESH_PRESCRIPTION_ID };

interface SeedPatientsAndEncountersParams {
  clinicId: string;
  /** The login/demo account (admin.doctor@docita.work) — gets the richest schedule. */
  adminDoctorId: string;
  doctor1Id: string;
  doctor2Id: string;
  patientPortalUserId: string;
}

export async function seedPatientsAndEncounters(
  prisma: PrismaClient,
  params: SeedPatientsAndEncountersParams,
): Promise<SeedEntityRef[]> {
  const { clinicId, adminDoctorId, doctor1Id, doctor2Id, patientPortalUserId } =
    params;
  const patients = await seedPatients(prisma, clinicId, patientPortalUserId);
  const appointments = await seedAppointments(prisma, {
    clinicId,
    adminDoctorId,
    doctor1Id,
    doctor2Id,
    patients,
  });
  const completedAppointments = appointments.filter(
    (a) => a.status === AppointmentStatus.COMPLETED,
  );
  const rajeshAppointment = getRajeshAppointment(appointments);

  await seedVitals(prisma, completedAppointments);
  await seedPrescriptions(
    prisma,
    clinicId,
    completedAppointments,
    rajeshAppointment,
  );
  await seedInvoices(prisma, clinicId, appointments, rajeshAppointment);
  await seedDocuments(prisma, clinicId, patients);
  await seedDiagnoses(prisma, completedAppointments);
  await seedFollowUps(prisma, completedAppointments);

  return patients.map((patient) => ({ id: patient.id }));
}

/**
 * Scheduled follow-ups so the Follow-ups page and the Today "Follow-ups due
 * today" card show real callbacks on camera. A few land today, the rest are
 * spread across the next two weeks; one per group is already reminded.
 */
async function seedFollowUps(
  prisma: PrismaClient,
  completedAppointments: Awaited<ReturnType<typeof seedAppointments>>,
): Promise<void> {
  const dayOffsets = [0, 0, 0, 1, 1, 2, 2, 3, 7, 7, 14, 14];
  const targets = completedAppointments.slice(0, dayOffsets.length);
  for (let i = 0; i < targets.length; i++) {
    const appt = targets[i];
    const status =
      i % 5 === 4 ? FollowUpStatus.REMINDER_SENT : FollowUpStatus.PENDING;
    const data = {
      appointmentId: appt.id,
      patientId: appt.patientId,
      doctorId: appt.doctorId,
      clinicId: appt.clinicId,
      scheduledDate: dateOffset(dayOffsets[i]),
      reason: FOLLOW_UP_REASONS[i % FOLLOW_UP_REASONS.length],
      status,
      reminderSentAt:
        status === FollowUpStatus.REMINDER_SENT ? dateOffset(-1) : null,
    };
    await prisma.followUp.upsert({
      where: { id: `seed-followup-${appt.id}` },
      update: data,
      create: { id: `seed-followup-${appt.id}`, ...data },
    });
  }
}

async function seedDiagnoses(
  prisma: PrismaClient,
  completedAppointments: Awaited<ReturnType<typeof seedAppointments>>,
): Promise<void> {
  const icdCodeIdByCode = new Map<string, string>();
  for (const entry of SEED_ICD_CODES) {
    const icdCode = await prisma.icdCode.upsert({
      where: { code: entry.code },
      update: {
        description: entry.description,
        category: entry.category,
        isCommon: true,
      },
      create: {
        code: entry.code,
        description: entry.description,
        category: entry.category,
        version: 'ICD-10',
        isCommon: true,
      },
    });
    icdCodeIdByCode.set(entry.code, icdCode.id);
  }

  for (let i = 0; i < completedAppointments.length; i++) {
    const appt = completedAppointments[i];
    const entry = SEED_ICD_CODES[i % SEED_ICD_CODES.length];
    const icdCodeId = icdCodeIdByCode.get(entry.code);
    await prisma.diagnosis.upsert({
      where: { id: `seed-diag-${appt.id}` },
      update: {
        appointmentId: appt.id,
        icdCodeId,
        notes: DIAGNOSIS_NOTES[i % DIAGNOSIS_NOTES.length],
      },
      create: {
        id: `seed-diag-${appt.id}`,
        appointmentId: appt.id,
        icdCodeId,
        notes: DIAGNOSIS_NOTES[i % DIAGNOSIS_NOTES.length],
      },
    });
  }
}

async function seedPatients(
  prisma: PrismaClient,
  clinicId: string,
  patientPortalUserId: string,
) {
  const patients = await Promise.all(
    SEEDED_PATIENTS.map((seededPatient, index) => {
      const linkedUserId = index === 0 ? patientPortalUserId : undefined;
      // jscpd:ignore-start
      return prisma.patient.upsert({
        where: { id: seededPatient.id },
        update: {
          firstName: seededPatient.firstName,
          lastName: seededPatient.lastName,
          dateOfBirth: seededPatient.dateOfBirth,
          gender: seededPatient.gender,
          bloodGroup: seededPatient.bloodGroup,
          allergies: seededPatient.allergies,
          phoneNumber: seedPatientPhone(index),
          email: seededPatient.email,
          address: seededPatient.address,
          medicalHistory: [...seededPatient.medicalHistory],
          clinicId,
          ...(linkedUserId ? { userId: linkedUserId } : {}),
        },
        create: {
          id: seededPatient.id,
          firstName: seededPatient.firstName,
          lastName: seededPatient.lastName,
          dateOfBirth: seededPatient.dateOfBirth,
          gender: seededPatient.gender,
          bloodGroup: seededPatient.bloodGroup,
          allergies: seededPatient.allergies,
          phoneNumber: seedPatientPhone(index),
          email: seededPatient.email,
          address: seededPatient.address,
          medicalHistory: [...seededPatient.medicalHistory],
          clinicId,
          ...(linkedUserId ? { userId: linkedUserId } : {}),
        },
      });
      // jscpd:ignore-end
    }),
  );
  return patients;
}

async function seedAppointments(
  prisma: PrismaClient,
  params: {
    clinicId: string;
    adminDoctorId: string;
    doctor1Id: string;
    doctor2Id: string;
    patients: Awaited<ReturnType<typeof seedPatients>>;
  },
) {
  const plans = buildAppointmentPlans();
  const doctorByKey = {
    admin: params.adminDoctorId,
    d1: params.doctor1Id,
    d2: params.doctor2Id,
  };

  const appointments = await Promise.all(
    plans.map((plan) => {
      const patient = params.patients[plan.patientIndex];
      const baseDate = dateOffset(plan.daysOffset);
      const startTime = withTime(baseDate, plan.hour, plan.minute);
      const endTime = new Date(startTime.getTime() + plan.durationMin * 60_000);
      const isCompleted = plan.status === AppointmentStatus.COMPLETED;
      const data = {
        patientId: patient.id,
        doctorId: doctorByKey[plan.doctorKey],
        clinicId: params.clinicId,
        startTime,
        endTime,
        status: plan.status,
        type: plan.type,
        notes: plan.note,
        ...(isCompleted
          ? {
              chiefComplaint:
                CHIEF_COMPLAINTS[plan.patientIndex % CHIEF_COMPLAINTS.length],
              consultationNotes:
                CONSULTATION_NOTES[
                  plan.patientIndex % CONSULTATION_NOTES.length
                ],
              treatmentPlan:
                TREATMENT_PLANS[plan.patientIndex % TREATMENT_PLANS.length],
              clinicalImpression:
                CLINICAL_IMPRESSIONS[
                  plan.patientIndex % CLINICAL_IMPRESSIONS.length
                ],
              historyOfPresentIllness:
                HPI_TEMPLATES[plan.patientIndex % HPI_TEMPLATES.length],
              pastMedicalHistory:
                patient.medicalHistory.length > 0
                  ? patient.medicalHistory.join(', ')
                  : 'Nil',
              generalExamination: {
                appearance: 'Alert and oriented',
                build: 'Average',
                pallor: 'No pallor',
                icterus: 'No icterus',
                cyanosis: 'No cyanosis',
                lymphadenopathy: 'No lymphadenopathy',
              },
            }
          : {}),
      };
      return prisma.appointment.upsert({
        where: { id: plan.id },
        update: data,
        create: { id: plan.id, ...data },
      });
    }),
  );
  return appointments;
}

async function seedVitals(
  prisma: PrismaClient,
  completedAppointments: Awaited<ReturnType<typeof seedAppointments>>,
): Promise<void> {
  await Promise.all(
    completedAppointments.map((appt, idx) => {
      const vitals = buildSeedVitals(idx);
      return prisma.vitalSign.upsert({
        where: { appointmentId: appt.id },
        update: vitals,
        create: { appointmentId: appt.id, ...vitals },
      });
    }),
  );
}

function getRajeshAppointment(
  appointments: Awaited<ReturnType<typeof seedAppointments>>,
) {
  const rajeshAppointment = appointments.find(
    (a) => a.id === RAJESH_APPOINTMENT_ID,
  );
  if (!rajeshAppointment)
    throw new Error('Rajesh canonical appointment missing from plans');
  return rajeshAppointment;
}

async function seedPrescriptions(
  prisma: PrismaClient,
  clinicId: string,
  completedAppointments: Awaited<ReturnType<typeof seedAppointments>>,
  rajeshAppointment: Awaited<ReturnType<typeof seedAppointments>>[number],
): Promise<void> {
  const prescriptionTargets = completedAppointments.slice(0, 9);
  const targets = [...prescriptionTargets, rajeshAppointment];
  const doctors = await prisma.user.findMany({
    where: { id: { in: [...new Set(targets.map((appt) => appt.doctorId))] } },
    select: { id: true, name: true },
  });
  const doctorNames = new Map(
    doctors.map((doctor) => [doctor.id, doctor.name]),
  );

  for (let i = 0; i < targets.length; i++) {
    const appt = targets[i];
    const doctorName = doctorNames.get(appt.doctorId);
    if (!doctorName?.trim()) {
      throw new Error(
        `seed-prescriptions: doctor ${appt.doctorId} is missing or has no name`,
      );
    }
    const prescriptionId =
      appt.id === RAJESH_APPOINTMENT_ID
        ? RAJESH_PRESCRIPTION_ID
        : `seed-rx-${appt.id}`;
    const prescription = await prisma.prescription.upsert({
      where: { id: prescriptionId },
      update: {
        appointmentId: appt.id,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        doctorName,
        clinicId,
        instructions:
          'Take medications according to the prescription. Adhere to lifestyle advice. Return for follow-up if symptoms persist.',
      },
      create: {
        id: prescriptionId,
        appointmentId: appt.id,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        doctorName,
        clinicId,
        instructions:
          'Take medications according to the prescription. Adhere to lifestyle advice. Return for follow-up if symptoms persist.',
      },
    });

    await prisma.medication.deleteMany({
      where: { prescriptionId: prescription.id },
    });
    const medCount = 2 + (i % 3);
    const now = new Date();
    await prisma.medication.createMany({
      data: Array.from({ length: medCount }, (_, k) => {
        const tpl = MEDICATION_TEMPLATES[(i + k) % MEDICATION_TEMPLATES.length];
        const startDate = new Date(now);
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + parseInt(tpl.duration) || 30);
        return {
          prescriptionId: prescription.id,
          name: tpl.name,
          dosage: tpl.dosage,
          frequency: tpl.frequency,
          duration: tpl.duration,
          route: tpl.route,
          dosageForm: tpl.dosageForm,
          sigCode: tpl.sigCode,
          quantity: tpl.quantity,
          refillsAllowed: tpl.refillsAllowed,
          startDate,
          endDate,
        };
      }),
    });
  }
}

async function seedInvoices(
  prisma: PrismaClient,
  clinicId: string,
  appointments: Awaited<ReturnType<typeof seedAppointments>>,
  rajeshAppointment: Awaited<ReturnType<typeof seedAppointments>>[number],
): Promise<void> {
  const invoiceTargets = [
    rajeshAppointment,
    ...appointments.filter((a) => a.id !== RAJESH_APPOINTMENT_ID).slice(0, 14),
  ];
  for (let i = 0; i < invoiceTargets.length; i++) {
    const { invoiceId, data } = getSeedInvoiceData(
      invoiceTargets[i],
      clinicId,
      i,
    );
    await prisma.invoice.upsert({
      where: { id: invoiceId },
      update: data,
      create: { id: invoiceId, ...data },
    });
  }

  // Advance the clinic's invoice counter past the seeded numbers so an
  // invoice created live during a demo gets the next number (no collision
  // with the seeded DC{FY}-NNNNNN values).
  await prisma.invoiceSequence.upsert({
    where: {
      clinicId_financialYear: {
        clinicId,
        financialYear: SEED_INVOICE_FINANCIAL_YEAR,
      },
    },
    update: {
      currentValue: invoiceTargets.length,
      prefix: SEED_INVOICE_PREFIX,
    },
    create: {
      clinic: { connect: { id: clinicId } },
      financialYear: SEED_INVOICE_FINANCIAL_YEAR,
      prefix: SEED_INVOICE_PREFIX,
      currentValue: invoiceTargets.length,
    },
  });
}

async function seedDocuments(
  prisma: PrismaClient,
  clinicId: string,
  patients: Awaited<ReturnType<typeof seedPatients>>,
): Promise<void> {
  await Promise.all(
    getSeedDocumentPlans(patients).map((doc) =>
      prisma.document.upsert({
        where: { id: doc.id },
        update: {
          patientId: doc.patientId,
          clinicId,
          name: doc.name,
          type: doc.type,
          url: doc.url,
        },
        create: {
          id: doc.id,
          patientId: doc.patientId,
          clinicId,
          name: doc.name,
          type: doc.type,
          url: doc.url,
        },
      }),
    ),
  );
}
