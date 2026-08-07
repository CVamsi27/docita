import {
  AppointmentStatus,
  FollowUpStatus,
  InvoiceStatus,
  Prisma,
  PrismaClient,
} from '@workspace/db';
import { seedPatientPhone } from './seed-constants';
import { dateOffset, withTime } from './seed-date-helpers';

type SeedEntityRef = { id: string };

interface SeedPatientsAndEncountersParams {
  clinicId: string;
  /** The login/demo account (admin.doctor@docita.work) — gets the richest schedule. */
  adminDoctorId: string;
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
  email: string;
  address: string;
  medicalHistory: string[];
}

const SEEDED_PATIENTS: SeedPatient[] = [
  {
    id: 'seed-patient-rajesh',
    firstName: 'Rajesh',
    lastName: 'Kumar',
    dateOfBirth: new Date('1985-03-15'),
    gender: 'MALE',
    bloodGroup: 'O+',
    allergies: 'Penicillin',
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
  doctorKey: 'admin' | 'd1' | 'd2';
  daysOffset: number;
  hour: number;
  minute: number;
  durationMin: number;
  status: AppointmentStatus;
  type: string;
  note: string;
}

function buildAppointmentPlans(): AppointmentPlan[] {
  return [
    ...buildPastAppointmentPlans(),
    ...buildTodayAppointmentPlans(),
    ...buildFutureAppointmentPlans(),
    getRajeshCanonicalAppointmentPlan(),
  ];
}

/**
 * A full, realistic clinic day for the demo login (admin.doctor), so the
 * Appointments calendar and Today queue look busy on camera instead of
 * empty. Mixed statuses tell the story of a day in progress: earlier slots
 * done, one in progress now, the rest still to come.
 */
function buildTodayAppointmentPlans(): AppointmentPlan[] {
  const slots: Array<{
    hour: number;
    minute: number;
    patientIndex: number;
    status: AppointmentStatus;
    type: string;
  }> = [
    {
      hour: 9,
      minute: 0,
      patientIndex: 4,
      status: AppointmentStatus.COMPLETED,
      type: 'consultation',
    },
    {
      hour: 9,
      minute: 30,
      patientIndex: 8,
      status: AppointmentStatus.COMPLETED,
      type: 'follow-up',
    },
    {
      hour: 10,
      minute: 0,
      patientIndex: 12,
      status: AppointmentStatus.COMPLETED,
      type: 'check-up',
    },
    {
      hour: 10,
      minute: 30,
      patientIndex: 2,
      status: AppointmentStatus.IN_PROGRESS,
      type: 'consultation',
    },
    {
      hour: 11,
      minute: 0,
      patientIndex: 15,
      status: AppointmentStatus.CONFIRMED,
      type: 'follow-up',
    },
    {
      hour: 11,
      minute: 30,
      patientIndex: 19,
      status: AppointmentStatus.CONFIRMED,
      type: 'consultation',
    },
    {
      hour: 12,
      minute: 0,
      patientIndex: 6,
      status: AppointmentStatus.SCHEDULED,
      type: 'check-up',
    },
    {
      hour: 14,
      minute: 30,
      patientIndex: 10,
      status: AppointmentStatus.CONFIRMED,
      type: 'consultation',
    },
    {
      hour: 15,
      minute: 0,
      patientIndex: 21,
      status: AppointmentStatus.SCHEDULED,
      type: 'follow-up',
    },
  ];

  return slots.map((slot, i) => ({
    id: `seed-apt-today-${i.toString().padStart(2, '0')}`,
    patientIndex: slot.patientIndex % SEEDED_PATIENTS.length,
    doctorKey: 'admin',
    daysOffset: 0,
    hour: slot.hour,
    minute: slot.minute,
    durationMin: 30,
    status: slot.status,
    type: slot.type,
    note: APPOINTMENT_NOTES[i % APPOINTMENT_NOTES.length],
  }));
}

function buildPastAppointmentPlans(): AppointmentPlan[] {
  const typeCycle = [
    'consultation',
    'follow-up',
    'check-up',
    'consultation',
    'follow-up',
  ];
  const plans: AppointmentPlan[] = [];

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
      doctorKey: (['admin', 'd1', 'd2'] as const)[i % 3],
      daysOffset,
      hour: 9 + (i % 8),
      minute: (i % 2) * 30,
      durationMin: 30,
      status,
      type: typeCycle[i % typeCycle.length],
      note: APPOINTMENT_NOTES[i % APPOINTMENT_NOTES.length],
    });
  }

  return plans;
}

function buildFutureAppointmentPlans(): AppointmentPlan[] {
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

  for (let i = 0; i < 25; i++) {
    const patientIndex = (i * 3) % SEEDED_PATIENTS.length;
    const daysOffset = Math.floor((i * 30) / 25) + 1;
    const status =
      i % 3 === 0 ? AppointmentStatus.SCHEDULED : AppointmentStatus.CONFIRMED;
    plans.push({
      id: `seed-apt-future-${i.toString().padStart(2, '0')}`,
      patientIndex,
      doctorKey: (['admin', 'd2', 'd1'] as const)[i % 3],
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

  return plans;
}

function getRajeshCanonicalAppointmentPlan(): AppointmentPlan {
  return {
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
  };
}

const MEDICATION_TEMPLATES: Array<{
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  dosageForm: Prisma.MedicationCreateInput['dosageForm'];
  sigCode: Prisma.MedicationCreateInput['sigCode'];
  quantity: number;
  refillsAllowed: number;
}> = [
  {
    name: 'Metformin',
    dosage: '500mg',
    frequency: 'Twice daily',
    duration: '30 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'BID',
    quantity: 60,
    refillsAllowed: 2,
  },
  {
    name: 'Amlodipine',
    dosage: '5mg',
    frequency: 'Once daily',
    duration: '30 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'QD',
    quantity: 30,
    refillsAllowed: 2,
  },
  {
    name: 'Atorvastatin',
    dosage: '10mg',
    frequency: 'At bedtime',
    duration: '30 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'QHS',
    quantity: 30,
    refillsAllowed: 2,
  },
  {
    name: 'Pantoprazole',
    dosage: '40mg',
    frequency: 'Before breakfast',
    duration: '14 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'QAM',
    quantity: 14,
    refillsAllowed: 0,
  },
  {
    name: 'Levothyroxine',
    dosage: '50mcg',
    frequency: 'Once daily',
    duration: '90 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'QD',
    quantity: 90,
    refillsAllowed: 3,
  },
  {
    name: 'Salbutamol Inhaler',
    dosage: '100mcg',
    frequency: 'As needed',
    duration: '30 days',
    route: 'Inhalation',
    dosageForm: 'INHALER',
    sigCode: 'PRN',
    quantity: 1,
    refillsAllowed: 1,
  },
  {
    name: 'Paracetamol',
    dosage: '500mg',
    frequency: 'Every 6 hours',
    duration: '5 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'Q6H',
    quantity: 20,
    refillsAllowed: 0,
  },
  {
    name: 'Azithromycin',
    dosage: '500mg',
    frequency: 'Once daily',
    duration: '5 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'QD',
    quantity: 5,
    refillsAllowed: 0,
  },
  {
    name: 'Cetirizine',
    dosage: '10mg',
    frequency: 'Once daily at night',
    duration: '7 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'QHS',
    quantity: 7,
    refillsAllowed: 0,
  },
  {
    name: 'Omeprazole',
    dosage: '20mg',
    frequency: 'Before breakfast',
    duration: '14 days',
    route: 'Oral',
    dosageForm: 'CAPSULE',
    sigCode: 'QAM',
    quantity: 14,
    refillsAllowed: 0,
  },
];

const INVOICE_STATUS_PLAN: InvoiceStatus[] = [
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

export const RAJESH_APPOINTMENT_ID = 'seed-apt-rajesh-completed';
export const RAJESH_PRESCRIPTION_ID = 'seed-prescription-rajesh';
export const RAJESH_INVOICE_ID = 'seed-invoice-rajesh';

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

const FOLLOW_UP_REASONS = [
  'Review blood pressure and medication response',
  'Re-check fasting glucose and HbA1c',
  'Post-consultation symptom review',
  'Review lab results',
  'Medication titration follow-up',
  'Routine chronic-care review',
];

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

/**
 * A small ICD-10 catalogue of common primary-care conditions, spread across
 * several body systems so the analytics "Top diagnoses" and "Disease
 * distribution" charts render with real data on camera instead of empty
 * states. Categories drive the distribution donut.
 */
const SEED_ICD_CODES: Array<{
  code: string;
  description: string;
  category: string;
}> = [
  {
    code: 'E11.9',
    description: 'Type 2 diabetes mellitus without complications',
    category: 'Endocrine',
  },
  {
    code: 'I10',
    description: 'Essential (primary) hypertension',
    category: 'Circulatory',
  },
  {
    code: 'J45.909',
    description: 'Unspecified asthma, uncomplicated',
    category: 'Respiratory',
  },
  {
    code: 'J06.9',
    description: 'Acute upper respiratory infection, unspecified',
    category: 'Respiratory',
  },
  { code: 'M54.5', description: 'Low back pain', category: 'Musculoskeletal' },
  {
    code: 'M17.9',
    description: 'Osteoarthritis of knee, unspecified',
    category: 'Musculoskeletal',
  },
  {
    code: 'K21.9',
    description: 'Gastro-oesophageal reflux disease without oesophagitis',
    category: 'Digestive',
  },
  {
    code: 'E78.5',
    description: 'Hyperlipidaemia, unspecified',
    category: 'Endocrine',
  },
  {
    code: 'E03.9',
    description: 'Hypothyroidism, unspecified',
    category: 'Endocrine',
  },
  {
    code: 'N39.0',
    description: 'Urinary tract infection, site not specified',
    category: 'Genitourinary',
  },
  {
    code: 'F41.9',
    description: 'Anxiety disorder, unspecified',
    category: 'Mental health',
  },
  { code: 'R51', description: 'Headache', category: 'Symptoms & signs' },
];

const DIAGNOSIS_NOTES = [
  'Stable on current management; continue therapy.',
  'Symptoms improving since last visit.',
  'Newly diagnosed; treatment plan initiated.',
  'Reviewed labs; medication adjusted.',
  'Counselled on lifestyle modification.',
  'Follow-up advised in four weeks.',
];

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

const CHIEF_COMPLAINTS = [
  'Fever and cough for 3 days',
  'Intermittent headaches for 2 weeks',
  'Joint pain in both knees for 1 month',
  'Abdominal pain after meals',
  'Chest discomfort on exertion',
  'Skin rash on forearm',
  'Lower back pain for 1 week',
  'Fatigue and weight gain',
  'Recurrent sneezing and nasal discharge',
  'Insomnia for 2 weeks',
];

const CONSULTATION_NOTES = [
  'Patient presents with acute symptoms. Vitals stable. No signs of distress. Examination unremarkable. Prescribed symptomatic treatment.',
  'Chronic condition follow-up. Patient reports compliance with current regimen. BP/BSL within target range. Continue current medications.',
  'New onset symptoms. Detailed history taken. Differential diagnoses considered. Investigations ordered. Will review results at follow-up.',
  'Post-procedure review. Wound healing well. No signs of infection. Patient reports pain 3/10. Medications adjusted.',
  'Routine health screening. All vitals normal. Lifestyle counselling provided. Discussed diet and exercise modifications.',
];

const TREATMENT_PLANS = [
  'Continue current medications. Follow up in 2 weeks. Maintain food diary. Regular exercise 30 min/day.',
  'Medication adjusted based on latest labs. Follow up in 4 weeks. Low sodium diet. Monitor BP daily.',
  'Short course of antibiotics prescribed. Rest and fluids. Return if symptoms worsen. Follow up in 1 week.',
  'Physiotherapy referral made. Analgesics for pain relief. Avoid heavy lifting. Review in 2 weeks.',
  'Lifestyle modifications counselled. Weight management plan discussed. Follow up in 3 months for reassessment.',
];

const CLINICAL_IMPRESSIONS = [
  'Viral upper respiratory infection. Supportive care advised.',
  'Essential hypertension, well-controlled on current medications.',
  'Musculoskeletal strain. Rule out osteoarthritis pending X-ray.',
  'Functional dyspepsia. PPI trial started.',
  'Generalized anxiety disorder. Started on low-dose anxiolytic.',
];

const HPI_TEMPLATES = [
  'Symptoms started 3 days ago. Gradual onset. No aggravating factors identified. No similar episodes in the past.',
  'Chronic symptoms, fluctuating intensity. Better with rest, worse with activity. No radiation of pain.',
  'Intermittent symptoms for the past month. No associated fever, weight loss, or night sweats. No significant past history.',
  'Acute onset, severe intensity initially, now moderate. No relation to meals or time of day. No associated nausea.',
  'Progressive symptoms over 2 weeks. No relieving or aggravating factors identified. Patient anxious about symptoms.',
];

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

/**
 * Indian financial year code (e.g. "2627" for FY 2026-27) for the current
 * date, mirroring the API's invoice-number format so seeded invoices read
 * like real ones (DC2627-000001) on camera instead of leaking the row id.
 */
const SEED_INVOICE_FINANCIAL_YEAR = (() => {
  const now = new Date();
  const startYear =
    now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return `${String(startYear).slice(-2)}${String(startYear + 1).slice(-2)}`;
})();

const SEED_INVOICE_PREFIX = 'DC';

function seedInvoiceNumber(sequence: number): string {
  return `${SEED_INVOICE_PREFIX}${SEED_INVOICE_FINANCIAL_YEAR}-${String(
    sequence,
  ).padStart(6, '0')}`;
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

function getSeedInvoiceData(
  appt: Awaited<ReturnType<typeof seedAppointments>>[number],
  clinicId: string,
  index: number,
) {
  const invoiceId =
    appt.id === RAJESH_APPOINTMENT_ID
      ? RAJESH_INVOICE_ID
      : `seed-inv-${appt.id}`;
  const consultFee = 800 + (index % 5) * 100;
  const rxFee = 200;
  const vitalsFee = 300;
  const labFee = index % 3 === 0 ? 500 : 0;
  const procedureFee = index % 4 === 0 ? 1000 : 0;

  const items = [
    {
      description: 'Consultation Fee',
      quantity: 1,
      price: consultFee,
      gstRate: 0,
    },
    { description: 'Prescription', quantity: 1, price: rxFee, gstRate: 0 },
    { description: 'Vitals Check', quantity: 1, price: vitalsFee, gstRate: 0 },
    ...(labFee > 0
      ? [
          {
            description: 'Lab Investigation',
            quantity: 1,
            price: labFee,
            gstRate: 18,
          },
        ]
      : []),
    ...(procedureFee > 0
      ? [
          {
            description: 'Minor Procedure',
            quantity: 1,
            price: procedureFee,
            gstRate: 18,
          },
        ]
      : []),
  ];

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const taxTotal = items.reduce(
    (sum, item) =>
      sum + Math.round((item.price * item.quantity * item.gstRate) / 100),
    0,
  );
  const grandTotal = subtotal + taxTotal;

  const taxSummary = items
    .filter((item) => item.gstRate > 0)
    .map((item) => ({
      rate: item.gstRate,
      taxableAmount: item.price * item.quantity,
      taxAmount: Math.round((item.price * item.quantity * item.gstRate) / 100),
    }));

  return {
    appt,
    invoiceId,
    data: {
      appointmentId: appt.id,
      patientId: appt.patientId,
      clinicId,
      invoiceNumber: seedInvoiceNumber(index + 1),
      total: grandTotal,
      subtotal,
      taxTotal,
      grandTotal,
      status: INVOICE_STATUS_PLAN[index] ?? InvoiceStatus.PAID,
      items,
      taxSummary: taxSummary.length > 0 ? taxSummary : undefined,
      placeOfSupplyStateCode: '29',
      reverseCharge: false,
    },
  };
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

function getSeedDocumentPlans(
  patients: Awaited<ReturnType<typeof seedPatients>>,
): Array<{
  id: string;
  patientId: string;
  name: string;
  type: string;
  url: string;
}> {
  return [
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
    {
      id: 'seed-document-amit-lipid',
      patientId: patients[2].id,
      name: 'Lipid Profile Report',
      type: 'LAB_REPORT',
      url: '/uploads/seed/documents/lipid-amit.pdf',
    },
    {
      id: 'seed-document-anita-thyroid',
      patientId: patients[5].id,
      name: 'Thyroid Function Test',
      type: 'LAB_REPORT',
      url: '/uploads/seed/documents/thyroid-anita.pdf',
    },
    {
      id: 'seed-document-rohit-hba1c',
      patientId: patients[12].id,
      name: 'HbA1c Test Report',
      type: 'LAB_REPORT',
      url: '/uploads/seed/documents/hba1c-rohit.pdf',
    },
    {
      id: 'seed-document-shreya-mri',
      patientId: patients[20].id,
      name: 'MRI Brain',
      type: 'OTHER',
      url: '/uploads/seed/documents/mri-shreya.pdf',
    },
  ];
}
