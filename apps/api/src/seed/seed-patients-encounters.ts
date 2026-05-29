import { AppointmentStatus, InvoiceStatus, PrismaClient } from '@workspace/db';
import {
  DEFAULT_TIMEZONE,
  formatClinicTodayPickerIso,
  formatUtcInstantAsClinicPickerIso,
  fromLocalISOString,
} from '@workspace/utils';
import { SEED_PATIENT_PHONE_NUMBER } from './seed-constants';

type SeedEntityRef = { id: string };

interface SeedPatientsAndEncountersParams {
  clinicId: string;
  doctor1Id: string;
  doctor2Id: string;
  patientPortalUserId: string;
}

interface SeedPatient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'MALE' | 'FEMALE';
  bloodGroup: string;
  allergies: string | null;
  phoneNumber: string;
  email: string;
  address: string;
  medicalHistory: string[];
}

// 25 deterministic patients. First entry (Rajesh) is linked to the patient
// portal user and is the subject of the hand-generated prescription + invoice
// PDFs.
const SEEDED_PATIENTS: SeedPatient[] = [
  {
    id: 'seed-patient-rajesh',
    firstName: 'Rajesh',
    lastName: 'Kumar',
    dateOfBirth: new Date('1985-03-15'),
    gender: 'MALE',
    bloodGroup: 'O+',
    allergies: 'Penicillin',
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'rajesh.kumar@docita.work',
    address: '123 MG Road, Bangalore',
    medicalHistory: ['Hypertension', 'Diabetes Type 2'],
  },
  {
    id: 'seed-patient-priya',
    firstName: 'Priya',
    lastName: 'Nair',
    dateOfBirth: new Date('1990-07-22'),
    gender: 'FEMALE',
    bloodGroup: 'A+',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'priya.nair@docita.work',
    address: '456 Brigade Road, Bangalore',
    medicalHistory: ['Asthma'],
  },
  {
    id: 'seed-patient-amit',
    firstName: 'Amit',
    lastName: 'Patel',
    dateOfBirth: new Date('1978-11-30'),
    gender: 'MALE',
    bloodGroup: 'B+',
    allergies: 'Sulfa drugs',
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'amit.patel@docita.work',
    address: '789 Residency Road, Bangalore',
    medicalHistory: ['Arthritis'],
  },
  {
    id: 'seed-patient-lakshmi',
    firstName: 'Lakshmi',
    lastName: 'Iyer',
    dateOfBirth: new Date('1995-05-18'),
    gender: 'FEMALE',
    bloodGroup: 'AB+',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'lakshmi.iyer@docita.work',
    address: '321 Indiranagar, Bangalore',
    medicalHistory: [],
  },
  {
    id: 'seed-patient-suresh',
    firstName: 'Suresh',
    lastName: 'Reddy',
    dateOfBirth: new Date('1982-09-10'),
    gender: 'MALE',
    bloodGroup: 'O-',
    allergies: 'Latex',
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'suresh.reddy@docita.work',
    address: '654 Koramangala, Bangalore',
    medicalHistory: ['Migraine'],
  },
  {
    id: 'seed-patient-anita',
    firstName: 'Anita',
    lastName: 'Desai',
    dateOfBirth: new Date('1988-02-04'),
    gender: 'FEMALE',
    bloodGroup: 'B-',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'anita.desai@docita.work',
    address: '12 HSR Layout, Bangalore',
    medicalHistory: ['Hypothyroidism'],
  },
  {
    id: 'seed-patient-vikram',
    firstName: 'Vikram',
    lastName: 'Singh',
    dateOfBirth: new Date('1972-12-25'),
    gender: 'MALE',
    bloodGroup: 'A-',
    allergies: 'Aspirin',
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'vikram.singh@docita.work',
    address: '88 Jayanagar, Bangalore',
    medicalHistory: ['Coronary Artery Disease'],
  },
  {
    id: 'seed-patient-meera',
    firstName: 'Meera',
    lastName: 'Krishnan',
    dateOfBirth: new Date('2001-08-08'),
    gender: 'FEMALE',
    bloodGroup: 'O+',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'meera.krishnan@docita.work',
    address: '5 BTM Layout, Bangalore',
    medicalHistory: [],
  },
  {
    id: 'seed-patient-arjun',
    firstName: 'Arjun',
    lastName: 'Menon',
    dateOfBirth: new Date('1992-06-14'),
    gender: 'MALE',
    bloodGroup: 'AB-',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'arjun.menon@docita.work',
    address: '17 Whitefield, Bangalore',
    medicalHistory: ['Anxiety'],
  },
  {
    id: 'seed-patient-divya',
    firstName: 'Divya',
    lastName: 'Pillai',
    dateOfBirth: new Date('1986-04-19'),
    gender: 'FEMALE',
    bloodGroup: 'A+',
    allergies: 'Peanuts',
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'divya.pillai@docita.work',
    address: '99 Marathahalli, Bangalore',
    medicalHistory: ['GERD'],
  },
  {
    id: 'seed-patient-karan',
    firstName: 'Karan',
    lastName: 'Verma',
    dateOfBirth: new Date('1965-01-30'),
    gender: 'MALE',
    bloodGroup: 'B+',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'karan.verma@docita.work',
    address: '23 Banashankari, Bangalore',
    medicalHistory: ['Hypertension', 'COPD'],
  },
  {
    id: 'seed-patient-sneha',
    firstName: 'Sneha',
    lastName: 'Rao',
    dateOfBirth: new Date('1998-10-12'),
    gender: 'FEMALE',
    bloodGroup: 'O+',
    allergies: 'Shellfish',
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'sneha.rao@docita.work',
    address: '60 Hebbal, Bangalore',
    medicalHistory: [],
  },
  {
    id: 'seed-patient-rohit',
    firstName: 'Rohit',
    lastName: 'Sharma',
    dateOfBirth: new Date('1980-07-07'),
    gender: 'MALE',
    bloodGroup: 'O+',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'rohit.sharma@docita.work',
    address: '14 Yelahanka, Bangalore',
    medicalHistory: ['Type 2 Diabetes'],
  },
  {
    id: 'seed-patient-kavita',
    firstName: 'Kavita',
    lastName: 'Joshi',
    dateOfBirth: new Date('1975-11-21'),
    gender: 'FEMALE',
    bloodGroup: 'B+',
    allergies: 'Ibuprofen',
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'kavita.joshi@docita.work',
    address: '7 Malleswaram, Bangalore',
    medicalHistory: ['Osteoporosis'],
  },
  {
    id: 'seed-patient-deepak',
    firstName: 'Deepak',
    lastName: 'Gupta',
    dateOfBirth: new Date('1989-09-03'),
    gender: 'MALE',
    bloodGroup: 'A+',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'deepak.gupta@docita.work',
    address: '202 Electronic City, Bangalore',
    medicalHistory: ['Allergic Rhinitis'],
  },
  {
    id: 'seed-patient-pooja',
    firstName: 'Pooja',
    lastName: 'Bhatt',
    dateOfBirth: new Date('1993-03-28'),
    gender: 'FEMALE',
    bloodGroup: 'AB+',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'pooja.bhatt@docita.work',
    address: '40 Domlur, Bangalore',
    medicalHistory: ['PCOS'],
  },
  {
    id: 'seed-patient-rahul',
    firstName: 'Rahul',
    lastName: 'Mehta',
    dateOfBirth: new Date('2010-05-05'),
    gender: 'MALE',
    bloodGroup: 'O+',
    allergies: 'Dust',
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'rahul.mehta@docita.work',
    address: '11 RT Nagar, Bangalore',
    medicalHistory: ['Childhood Asthma'],
  },
  {
    id: 'seed-patient-ritu',
    firstName: 'Ritu',
    lastName: 'Khanna',
    dateOfBirth: new Date('1968-12-12'),
    gender: 'FEMALE',
    bloodGroup: 'A-',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'ritu.khanna@docita.work',
    address: '9 Frazer Town, Bangalore',
    medicalHistory: ['Rheumatoid Arthritis'],
  },
  {
    id: 'seed-patient-sanjay',
    firstName: 'Sanjay',
    lastName: 'Kapoor',
    dateOfBirth: new Date('1958-04-04'),
    gender: 'MALE',
    bloodGroup: 'B-',
    allergies: 'Codeine',
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'sanjay.kapoor@docita.work',
    address: '88 Basaveshwaranagar, Bangalore',
    medicalHistory: ['Hypertension', 'Cataract'],
  },
  {
    id: 'seed-patient-neha',
    firstName: 'Neha',
    lastName: 'Agarwal',
    dateOfBirth: new Date('1996-01-18'),
    gender: 'FEMALE',
    bloodGroup: 'O+',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'neha.agarwal@docita.work',
    address: '21 Sarjapur, Bangalore',
    medicalHistory: [],
  },
  {
    id: 'seed-patient-aditya',
    firstName: 'Aditya',
    lastName: 'Chandra',
    dateOfBirth: new Date('2005-09-09'),
    gender: 'MALE',
    bloodGroup: 'A+',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'aditya.chandra@docita.work',
    address: '4 Vijayanagar, Bangalore',
    medicalHistory: ['Eczema'],
  },
  {
    id: 'seed-patient-shreya',
    firstName: 'Shreya',
    lastName: 'Saxena',
    dateOfBirth: new Date('1991-06-06'),
    gender: 'FEMALE',
    bloodGroup: 'B+',
    allergies: 'Pollen',
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'shreya.saxena@docita.work',
    address: '55 Bellandur, Bangalore',
    medicalHistory: ['Migraine'],
  },
  {
    id: 'seed-patient-naveen',
    firstName: 'Naveen',
    lastName: 'Hegde',
    dateOfBirth: new Date('1984-08-15'),
    gender: 'MALE',
    bloodGroup: 'O+',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'naveen.hegde@docita.work',
    address: '6 Rajajinagar, Bangalore',
    medicalHistory: ['Hyperlipidemia'],
  },
  {
    id: 'seed-patient-aishwarya',
    firstName: 'Aishwarya',
    lastName: 'Bose',
    dateOfBirth: new Date('1979-02-22'),
    gender: 'FEMALE',
    bloodGroup: 'AB+',
    allergies: null,
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'aishwarya.bose@docita.work',
    address: '18 Sadashivnagar, Bangalore',
    medicalHistory: ['Hypothyroidism', 'Anemia'],
  },
  {
    id: 'seed-patient-prakash',
    firstName: 'Prakash',
    lastName: 'Naidu',
    dateOfBirth: new Date('1960-10-10'),
    gender: 'MALE',
    bloodGroup: 'O-',
    allergies: 'Sulfonamides',
    phoneNumber: SEED_PATIENT_PHONE_NUMBER,
    email: 'prakash.naidu@docita.work',
    address: '77 JP Nagar, Bangalore',
    medicalHistory: ['Type 2 Diabetes', 'Diabetic Retinopathy'],
  },
];

const APPOINTMENT_NOTES = [
  'Routine follow-up consultation',
  'Annual health checkup',
  'Medication review',
  'Acute symptoms assessment',
  'Post-procedure follow-up',
  'Lifestyle counselling',
  'Lab results review',
  'Pre-operative consultation',
];

interface AppointmentPlan {
  id: string;
  patientIndex: number;
  doctorKey: 'd1' | 'd2';
  daysOffset: number;
  hour: number;
  minute: number;
  durationMin: number;
  status: AppointmentStatus;
  type: string;
  note: string;
}

// Build ~80 appointment plans deterministically.
function buildAppointmentPlans(): AppointmentPlan[] {
  const plans: AppointmentPlan[] = [];
  const statusCycle: AppointmentStatus[] = [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CANCELLED,
  ];
  const typeCycle = [
    'consultation',
    'follow-up',
    'check-up',
    'consultation',
    'follow-up',
  ];

  // Past appointments (COMPLETED-heavy): days -60..-1
  for (let i = 0; i < 55; i++) {
    const patientIndex = i % SEEDED_PATIENTS.length;
    const daysOffset = -(60 - Math.floor((i * 60) / 55));
    const status =
      i % 11 === 0
        ? AppointmentStatus.CANCELLED
        : i % 13 === 0
          ? AppointmentStatus.NO_SHOW
          : AppointmentStatus.COMPLETED;
    plans.push({
      id: `seed-apt-past-${i.toString().padStart(2, '0')}`,
      patientIndex,
      doctorKey: i % 2 === 0 ? 'd1' : 'd2',
      daysOffset,
      hour: 9 + (i % 8),
      minute: (i % 2) * 30,
      durationMin: 30,
      status,
      type: typeCycle[i % typeCycle.length],
      note: APPOINTMENT_NOTES[i % APPOINTMENT_NOTES.length],
    });
  }

  // Future appointments (SCHEDULED/CONFIRMED): days 1..30
  for (let i = 0; i < 25; i++) {
    const patientIndex = (i * 3) % SEEDED_PATIENTS.length;
    const daysOffset = Math.floor((i * 30) / 25) + 1;
    const status =
      i % 3 === 0 ? AppointmentStatus.SCHEDULED : AppointmentStatus.CONFIRMED;
    plans.push({
      id: `seed-apt-future-${i.toString().padStart(2, '0')}`,
      patientIndex,
      doctorKey: i % 2 === 0 ? 'd2' : 'd1',
      daysOffset,
      hour: 10 + (i % 7),
      minute: (i % 2) * 30,
      durationMin: 30,
      status:
        statusCycle[i % statusCycle.length] === AppointmentStatus.COMPLETED
          ? status
          : statusCycle[i % statusCycle.length],
      type: typeCycle[i % typeCycle.length],
      note: APPOINTMENT_NOTES[i % APPOINTMENT_NOTES.length],
    });
  }

  // Pin one canonical completed appointment for Rajesh today so the PDF
  // seeder has a stable target.
  plans.push({
    id: 'seed-apt-rajesh-completed',
    patientIndex: 0,
    doctorKey: 'd1',
    daysOffset: 0,
    hour: 9,
    minute: 0,
    durationMin: 30,
    status: AppointmentStatus.COMPLETED,
    type: 'consultation',
    note: 'Regular checkup for diabetes management',
  });

  return plans;
}

const MEDICATION_TEMPLATES: Array<{
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}> = [
  {
    name: 'Metformin',
    dosage: '500mg',
    frequency: 'Twice daily',
    duration: '30 days',
  },
  {
    name: 'Amlodipine',
    dosage: '5mg',
    frequency: 'Once daily',
    duration: '30 days',
  },
  {
    name: 'Atorvastatin',
    dosage: '10mg',
    frequency: 'At bedtime',
    duration: '30 days',
  },
  {
    name: 'Pantoprazole',
    dosage: '40mg',
    frequency: 'Before breakfast',
    duration: '14 days',
  },
  {
    name: 'Levothyroxine',
    dosage: '50mcg',
    frequency: 'Once daily',
    duration: '90 days',
  },
  {
    name: 'Salbutamol Inhaler',
    dosage: '100mcg',
    frequency: 'As needed',
    duration: '30 days',
  },
  {
    name: 'Paracetamol',
    dosage: '500mg',
    frequency: 'Every 6 hours',
    duration: '5 days',
  },
  {
    name: 'Azithromycin',
    dosage: '500mg',
    frequency: 'Once daily',
    duration: '5 days',
  },
];

function withTime(
  baseDate: Date,
  hour: number,
  minute: number,
  timezone: string = DEFAULT_TIMEZONE,
): Date {
  const dateStr = formatUtcInstantAsClinicPickerIso(baseDate, timezone);
  const instant = fromLocalISOString(
    `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    { timezone },
  );
  if (!instant) {
    throw new Error('Invalid seed appointment wall time');
  }
  return instant;
}

function dateOffset(days: number, timezone: string = DEFAULT_TIMEZONE): Date {
  const todayPicker = formatClinicTodayPickerIso(timezone);
  const noon = fromLocalISOString(`${todayPicker}T12:00`, { timezone });
  if (!noon) {
    throw new Error('Invalid seed date offset anchor');
  }
  return new Date(noon.getTime() + days * 24 * 60 * 60 * 1000);
}

export const RAJESH_APPOINTMENT_ID = 'seed-apt-rajesh-completed';
export const RAJESH_PRESCRIPTION_ID = 'seed-prescription-rajesh';
export const RAJESH_INVOICE_ID = 'seed-invoice-rajesh';

export async function seedPatientsAndEncounters(
  prisma: PrismaClient,
  params: SeedPatientsAndEncountersParams,
): Promise<SeedEntityRef[]> {
  const { clinicId, doctor1Id, doctor2Id, patientPortalUserId } = params;

  // Patients
  const patients = await Promise.all(
    SEEDED_PATIENTS.map((seededPatient, index) => {
      const linkedUserId = index === 0 ? patientPortalUserId : undefined;
      return prisma.patient.upsert({
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
          phoneNumber: seededPatient.phoneNumber,
          email: seededPatient.email,
          address: seededPatient.address,
          medicalHistory: [...seededPatient.medicalHistory],
          clinicId,
          ...(linkedUserId ? { userId: linkedUserId } : {}),
        },
      });
    }),
  );

  // Appointments
  const plans = buildAppointmentPlans();
  const doctorByKey = { d1: doctor1Id, d2: doctor2Id };

  const appointments = await Promise.all(
    plans.map((plan) => {
      const patient = patients[plan.patientIndex];
      const baseDate = dateOffset(plan.daysOffset);
      const startTime = withTime(baseDate, plan.hour, plan.minute);
      const endTime = new Date(startTime.getTime() + plan.durationMin * 60_000);
      const data = {
        patientId: patient.id,
        doctorId: doctorByKey[plan.doctorKey],
        clinicId,
        startTime,
        endTime,
        status: plan.status,
        type: plan.type,
        notes: plan.note,
      };
      return prisma.appointment.upsert({
        where: { id: plan.id },
        update: data,
        create: { id: plan.id, ...data },
      });
    }),
  );

  // Vitals on completed appointments
  const completedAppointments = appointments.filter(
    (a) => a.status === AppointmentStatus.COMPLETED,
  );
  await Promise.all(
    completedAppointments.map((appt, idx) => {
      const systolic = 110 + (idx % 5) * 8;
      const diastolic = 70 + (idx % 4) * 5;
      return prisma.vitalSign.upsert({
        where: { appointmentId: appt.id },
        update: {
          height: 160 + (idx % 25),
          weight: 55 + (idx % 30),
          bloodPressure: `${systolic}/${diastolic}`,
          pulse: 70 + (idx % 15),
          temperature: 98.2 + (idx % 4) * 0.2,
          spo2: 96 + (idx % 4),
        },
        create: {
          appointmentId: appt.id,
          height: 160 + (idx % 25),
          weight: 55 + (idx % 30),
          bloodPressure: `${systolic}/${diastolic}`,
          pulse: 70 + (idx % 15),
          temperature: 98.2 + (idx % 4) * 0.2,
          spo2: 96 + (idx % 4),
        },
      });
    }),
  );

  // Prescriptions on first 10 completed appointments. Rajesh's pinned one is
  // always last so its stable ID lands deterministically.
  const prescriptionTargets = completedAppointments.slice(0, 9);
  const rajeshAppointment = appointments.find(
    (a) => a.id === RAJESH_APPOINTMENT_ID,
  );
  if (!rajeshAppointment) {
    throw new Error('Rajesh canonical appointment missing from plans');
  }
  const targets = [...prescriptionTargets, rajeshAppointment];

  for (let i = 0; i < targets.length; i++) {
    const appt = targets[i];
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
        clinicId,
        instructions:
          'Take medications according to the prescription. Adhere to lifestyle advice. Return for follow-up if symptoms persist.',
      },
      create: {
        id: prescriptionId,
        appointmentId: appt.id,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        clinicId,
        instructions:
          'Take medications according to the prescription. Adhere to lifestyle advice. Return for follow-up if symptoms persist.',
      },
    });

    await prisma.medication.deleteMany({
      where: { prescriptionId: prescription.id },
    });
    const medCount = 2 + (i % 3);
    await prisma.medication.createMany({
      data: Array.from({ length: medCount }, (_, k) => {
        const tpl = MEDICATION_TEMPLATES[(i + k) % MEDICATION_TEMPLATES.length];
        return {
          prescriptionId: prescription.id,
          name: tpl.name,
          dosage: tpl.dosage,
          frequency: tpl.frequency,
          duration: tpl.duration,
        };
      }),
    });
  }

  // Invoices on first 15 appointments (mixed statuses).
  const invoiceStatusPlan: InvoiceStatus[] = [
    InvoiceStatus.PAID,
    InvoiceStatus.PAID,
    InvoiceStatus.PAID,
    InvoiceStatus.PAID,
    InvoiceStatus.PAID,
    InvoiceStatus.PAID,
    InvoiceStatus.PAID,
    InvoiceStatus.PAID,
    InvoiceStatus.PENDING,
    InvoiceStatus.PENDING,
    InvoiceStatus.PENDING,
    InvoiceStatus.PENDING,
    InvoiceStatus.OVERDUE,
    InvoiceStatus.OVERDUE,
    InvoiceStatus.CANCELLED,
  ];

  const invoiceTargets = [
    rajeshAppointment,
    ...appointments.filter((a) => a.id !== RAJESH_APPOINTMENT_ID).slice(0, 14),
  ];
  for (let i = 0; i < invoiceTargets.length; i++) {
    const appt = invoiceTargets[i];
    const status = invoiceStatusPlan[i] ?? InvoiceStatus.PAID;
    const invoiceId =
      appt.id === RAJESH_APPOINTMENT_ID
        ? RAJESH_INVOICE_ID
        : `seed-inv-${appt.id}`;
    const consultFee = 800 + (i % 5) * 100;
    const rxFee = 200;
    const vitalsFee = 300;
    const total = consultFee + rxFee + vitalsFee;
    await prisma.invoice.upsert({
      where: { id: invoiceId },
      update: {
        appointmentId: appt.id,
        patientId: appt.patientId,
        clinicId,
        total,
        status,
        items: [
          { description: 'Consultation Fee', quantity: 1, price: consultFee },
          { description: 'Prescription', quantity: 1, price: rxFee },
          { description: 'Vitals Check', quantity: 1, price: vitalsFee },
        ],
      },
      create: {
        id: invoiceId,
        appointmentId: appt.id,
        patientId: appt.patientId,
        clinicId,
        total,
        status,
        items: [
          { description: 'Consultation Fee', quantity: 1, price: consultFee },
          { description: 'Prescription', quantity: 1, price: rxFee },
          { description: 'Vitals Check', quantity: 1, price: vitalsFee },
        ],
      },
    });
  }

  // Documents
  const docPlans: Array<{
    id: string;
    patientId: string;
    name: string;
    type: string;
    url: string;
  }> = [
    {
      id: 'seed-document-rajesh-lab',
      patientId: patients[0].id,
      name: 'Blood Test Report - HbA1c',
      type: 'LAB_REPORT',
      url: '/uploads/seed/documents/blood-test-rajesh.pdf',
    },
    {
      id: 'seed-document-priya-xray',
      patientId: patients[1].id,
      name: 'Chest X-Ray',
      type: 'XRAY',
      url: '/uploads/seed/documents/xray-priya.pdf',
    },
    {
      id: 'seed-document-vikram-ecg',
      patientId: patients[6].id,
      name: 'ECG Report',
      type: 'OTHER',
      url: '/uploads/seed/documents/ecg-vikram.pdf',
    },
    {
      id: 'seed-document-karan-ct',
      patientId: patients[10].id,
      name: 'CT Scan - Chest',
      type: 'OTHER',
      url: '/uploads/seed/documents/ct-karan.pdf',
    },
  ];
  await Promise.all(
    docPlans.map((doc) =>
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

  return patients.map((patient) => ({ id: patient.id }));
}
