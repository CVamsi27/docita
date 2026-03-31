import { AppointmentStatus, InvoiceStatus, PrismaClient } from '@workspace/db';

type SeedEntityRef = { id: string };

interface SeedPatientsAndEncountersParams {
  clinicId: string;
  doctor1Id: string;
  doctor2Id: string;
}

const SEEDED_PATIENTS = [
  {
    id: 'seed-patient-rajesh',
    firstName: 'Rajesh',
    lastName: 'Kumar',
    dateOfBirth: new Date('1985-03-15'),
    gender: 'MALE' as const,
    bloodGroup: 'O+',
    allergies: 'Penicillin',
    phoneNumber: '9876543410',
    email: 'rajesh.kumar@docita.work',
    address: '123 MG Road, Bangalore',
    medicalHistory: ['Hypertension', 'Diabetes Type 2'],
  },
  {
    id: 'seed-patient-priya',
    firstName: 'Priya',
    lastName: 'Nair',
    dateOfBirth: new Date('1990-07-22'),
    gender: 'FEMALE' as const,
    bloodGroup: 'A+',
    allergies: null,
    phoneNumber: '9876543411',
    email: 'priya.nair@docita.work',
    address: '456 Brigade Road, Bangalore',
    medicalHistory: ['Asthma'],
  },
  {
    id: 'seed-patient-amit',
    firstName: 'Amit',
    lastName: 'Patel',
    dateOfBirth: new Date('1978-11-30'),
    gender: 'MALE' as const,
    bloodGroup: 'B+',
    allergies: 'Sulfa drugs',
    phoneNumber: '9876543412',
    email: 'amit.patel@docita.work',
    address: '789 Residency Road, Bangalore',
    medicalHistory: ['Arthritis'],
  },
  {
    id: 'seed-patient-lakshmi',
    firstName: 'Lakshmi',
    lastName: 'Iyer',
    dateOfBirth: new Date('1995-05-18'),
    gender: 'FEMALE' as const,
    bloodGroup: 'AB+',
    allergies: null,
    phoneNumber: '9876543413',
    email: 'lakshmi.iyer@docita.work',
    address: '321 Indiranagar, Bangalore',
    medicalHistory: [],
  },
  {
    id: 'seed-patient-suresh',
    firstName: 'Suresh',
    lastName: 'Reddy',
    dateOfBirth: new Date('1982-09-10'),
    gender: 'MALE' as const,
    bloodGroup: 'O-',
    allergies: 'Latex',
    phoneNumber: '9876543414',
    email: 'suresh.reddy@docita.work',
    address: '654 Koramangala, Bangalore',
    medicalHistory: ['Migraine'],
  },
] as const;

const SEEDED_IDS = {
  appointments: {
    rajeshCompleted: 'seed-apt-rajesh-completed',
    priyaFollowup: 'seed-apt-priya-followup',
    amitCheckup: 'seed-apt-amit-checkup',
    lakshmiConsult: 'seed-apt-lakshmi-consult',
    sureshConsult: 'seed-apt-suresh-consult',
  },
  prescription: 'seed-prescription-rajesh',
  invoice: 'seed-invoice-rajesh',
  documents: {
    rajeshLab: 'seed-document-rajesh-lab',
    priyaXray: 'seed-document-priya-xray',
  },
} as const;

function withTime(baseDate: Date, hour: number, minute: number): Date {
  const next = new Date(baseDate);
  next.setHours(hour, minute, 0, 0);
  return next;
}

export async function seedPatientsAndEncounters(
  prisma: PrismaClient,
  params: SeedPatientsAndEncountersParams,
): Promise<SeedEntityRef[]> {
  const { clinicId, doctor1Id, doctor2Id } = params;

  const patients = await Promise.all(
    SEEDED_PATIENTS.map((seededPatient) =>
      prisma.patient.upsert({
        where: { id: seededPatient.id },
        update: {
          firstName: seededPatient.firstName,
          lastName: seededPatient.lastName,
          dateOfBirth: seededPatient.dateOfBirth,
          gender: seededPatient.gender,
          bloodGroup: seededPatient.bloodGroup,
          allergies: seededPatient.allergies,
          phoneNumber: seededPatient.phoneNumber,
          email: seededPatient.email,
          address: seededPatient.address,
          medicalHistory: [...seededPatient.medicalHistory],
          clinicId,
        },
        create: {
          id: seededPatient.id,
          firstName: seededPatient.firstName,
          lastName: seededPatient.lastName,
          dateOfBirth: seededPatient.dateOfBirth,
          gender: seededPatient.gender,
          bloodGroup: seededPatient.bloodGroup,
          allergies: seededPatient.allergies,
          phoneNumber: seededPatient.phoneNumber,
          email: seededPatient.email,
          address: seededPatient.address,
          medicalHistory: [...seededPatient.medicalHistory],
          clinicId,
        },
      }),
    ),
  );

  const patientById = Object.fromEntries(
    patients.map((patient) => [patient.id, patient]),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const appointments = await Promise.all([
    prisma.appointment.upsert({
      where: { id: SEEDED_IDS.appointments.rajeshCompleted },
      update: {
        patientId: patientById['seed-patient-rajesh'].id,
        doctorId: doctor1Id,
        clinicId,
        startTime: withTime(today, 9, 0),
        endTime: withTime(today, 9, 30),
        status: AppointmentStatus.COMPLETED,
        type: 'consultation',
        notes: 'Regular checkup for diabetes management',
      },
      create: {
        id: SEEDED_IDS.appointments.rajeshCompleted,
        patientId: patientById['seed-patient-rajesh'].id,
        doctorId: doctor1Id,
        clinicId,
        startTime: withTime(today, 9, 0),
        endTime: withTime(today, 9, 30),
        status: AppointmentStatus.COMPLETED,
        type: 'consultation',
        notes: 'Regular checkup for diabetes management',
      },
    }),
    prisma.appointment.upsert({
      where: { id: SEEDED_IDS.appointments.priyaFollowup },
      update: {
        patientId: patientById['seed-patient-priya'].id,
        doctorId: doctor2Id,
        clinicId,
        startTime: withTime(tomorrow, 10, 0),
        endTime: withTime(tomorrow, 10, 30),
        status: AppointmentStatus.CONFIRMED,
        type: 'follow-up',
        notes: 'Follow-up for asthma treatment',
      },
      create: {
        id: SEEDED_IDS.appointments.priyaFollowup,
        patientId: patientById['seed-patient-priya'].id,
        doctorId: doctor2Id,
        clinicId,
        startTime: withTime(tomorrow, 10, 0),
        endTime: withTime(tomorrow, 10, 30),
        status: AppointmentStatus.CONFIRMED,
        type: 'follow-up',
        notes: 'Follow-up for asthma treatment',
      },
    }),
    prisma.appointment.upsert({
      where: { id: SEEDED_IDS.appointments.amitCheckup },
      update: {
        patientId: patientById['seed-patient-amit'].id,
        doctorId: doctor1Id,
        clinicId,
        startTime: withTime(nextWeek, 14, 0),
        endTime: withTime(nextWeek, 14, 30),
        status: AppointmentStatus.SCHEDULED,
        type: 'check-up',
        notes: 'Arthritis pain assessment',
      },
      create: {
        id: SEEDED_IDS.appointments.amitCheckup,
        patientId: patientById['seed-patient-amit'].id,
        doctorId: doctor1Id,
        clinicId,
        startTime: withTime(nextWeek, 14, 0),
        endTime: withTime(nextWeek, 14, 30),
        status: AppointmentStatus.SCHEDULED,
        type: 'check-up',
        notes: 'Arthritis pain assessment',
      },
    }),
    prisma.appointment.upsert({
      where: { id: SEEDED_IDS.appointments.lakshmiConsult },
      update: {
        patientId: patientById['seed-patient-lakshmi'].id,
        doctorId: doctor2Id,
        clinicId,
        startTime: withTime(today, 15, 0),
        endTime: withTime(today, 15, 30),
        status: AppointmentStatus.CONFIRMED,
        type: 'consultation',
        notes: 'First visit - general health checkup',
      },
      create: {
        id: SEEDED_IDS.appointments.lakshmiConsult,
        patientId: patientById['seed-patient-lakshmi'].id,
        doctorId: doctor2Id,
        clinicId,
        startTime: withTime(today, 15, 0),
        endTime: withTime(today, 15, 30),
        status: AppointmentStatus.CONFIRMED,
        type: 'consultation',
        notes: 'First visit - general health checkup',
      },
    }),
    prisma.appointment.upsert({
      where: { id: SEEDED_IDS.appointments.sureshConsult },
      update: {
        patientId: patientById['seed-patient-suresh'].id,
        doctorId: doctor1Id,
        clinicId,
        startTime: withTime(tomorrow, 11, 0),
        endTime: withTime(tomorrow, 11, 30),
        status: AppointmentStatus.SCHEDULED,
        type: 'consultation',
        notes: 'Migraine consultation',
      },
      create: {
        id: SEEDED_IDS.appointments.sureshConsult,
        patientId: patientById['seed-patient-suresh'].id,
        doctorId: doctor1Id,
        clinicId,
        startTime: withTime(tomorrow, 11, 0),
        endTime: withTime(tomorrow, 11, 30),
        status: AppointmentStatus.SCHEDULED,
        type: 'consultation',
        notes: 'Migraine consultation',
      },
    }),
  ]);

  const appointmentById = Object.fromEntries(
    appointments.map((appointment) => [appointment.id, appointment]),
  );
  const rajeshAppointment =
    appointmentById[SEEDED_IDS.appointments.rajeshCompleted];

  await prisma.vitalSign.upsert({
    where: { appointmentId: rajeshAppointment.id },
    update: {
      height: 175,
      weight: 78,
      bloodPressure: '140/90',
      pulse: 78,
      temperature: 98.6,
      spo2: 97,
    },
    create: {
      appointmentId: rajeshAppointment.id,
      height: 175,
      weight: 78,
      bloodPressure: '140/90',
      pulse: 78,
      temperature: 98.6,
      spo2: 97,
    },
  });

  const prescription = await prisma.prescription.upsert({
    where: { id: SEEDED_IDS.prescription },
    update: {
      appointmentId: rajeshAppointment.id,
      patientId: patientById['seed-patient-rajesh'].id,
      doctorId: doctor1Id,
      instructions:
        'Take medications as prescribed. Follow low-sugar diet. Exercise 30 mins daily.',
    },
    create: {
      id: SEEDED_IDS.prescription,
      appointmentId: rajeshAppointment.id,
      patientId: patientById['seed-patient-rajesh'].id,
      doctorId: doctor1Id,
      instructions:
        'Take medications as prescribed. Follow low-sugar diet. Exercise 30 mins daily.',
    },
  });

  await prisma.medication.deleteMany({
    where: { prescriptionId: prescription.id },
  });

  await prisma.medication.createMany({
    data: [
      {
        prescriptionId: prescription.id,
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
        duration: '30 days',
      },
      {
        prescriptionId: prescription.id,
        name: 'Amlodipine',
        dosage: '5mg',
        frequency: 'Once daily',
        duration: '30 days',
      },
    ],
  });

  await prisma.invoice.upsert({
    where: { id: SEEDED_IDS.invoice },
    update: {
      appointmentId: rajeshAppointment.id,
      patientId: patientById['seed-patient-rajesh'].id,
      total: 1500,
      status: InvoiceStatus.PAID,
      items: [
        { description: 'Consultation Fee', quantity: 1, price: 800 },
        { description: 'Prescription', quantity: 1, price: 200 },
        { description: 'Vitals Check', quantity: 1, price: 500 },
      ],
    },
    create: {
      id: SEEDED_IDS.invoice,
      appointmentId: rajeshAppointment.id,
      patientId: patientById['seed-patient-rajesh'].id,
      total: 1500,
      status: InvoiceStatus.PAID,
      items: [
        { description: 'Consultation Fee', quantity: 1, price: 800 },
        { description: 'Prescription', quantity: 1, price: 200 },
        { description: 'Vitals Check', quantity: 1, price: 500 },
      ],
    },
  });

  await prisma.document.upsert({
    where: { id: SEEDED_IDS.documents.rajeshLab },
    update: {
      patientId: patientById['seed-patient-rajesh'].id,
      name: 'Blood Test Report - Jan 2025',
      type: 'LAB_REPORT',
      url: '/uploads/documents/blood-test-rajesh-jan2025.pdf',
    },
    create: {
      id: SEEDED_IDS.documents.rajeshLab,
      patientId: patientById['seed-patient-rajesh'].id,
      name: 'Blood Test Report - Jan 2025',
      type: 'LAB_REPORT',
      url: '/uploads/documents/blood-test-rajesh-jan2025.pdf',
    },
  });

  await prisma.document.upsert({
    where: { id: SEEDED_IDS.documents.priyaXray },
    update: {
      patientId: patientById['seed-patient-priya'].id,
      name: 'X-Ray Chest - Dec 2024',
      type: 'XRAY',
      url: '/uploads/documents/xray-priya-dec2024.pdf',
    },
    create: {
      id: SEEDED_IDS.documents.priyaXray,
      patientId: patientById['seed-patient-priya'].id,
      name: 'X-Ray Chest - Dec 2024',
      type: 'XRAY',
      url: '/uploads/documents/xray-priya-dec2024.pdf',
    },
  });

  const allSeedPatientIds = (
    await prisma.patient.findMany({
      where: {
        clinicId,
        email: { in: SEEDED_PATIENTS.map((patient) => patient.email) },
      },
      select: { id: true },
    })
  ).map((patient) => patient.id);

  await prisma.appointment.updateMany({
    where: {
      patientId: { in: allSeedPatientIds },
      id: {
        notIn: Object.values(SEEDED_IDS.appointments),
      },
      status: AppointmentStatus.COMPLETED,
    },
    data: {
      status: AppointmentStatus.CANCELLED,
      notes:
        'Legacy seed appointment retired to keep seeded usage baseline idempotent.',
    },
  });

  return patients.map((patient) => ({ id: patient.id }));
}
