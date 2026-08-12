import { PrismaClient } from '@workspace/db';
import * as bcrypt from 'bcrypt';
import { SEED_PATIENT_PHONE_NUMBER_E164 } from './seed-constants';
import {
  SEED_DEFAULT_CLINIC_PLAN,
  SEED_DOCTOR_PLANS,
  SEED_STAFF_PLANS,
  seededSignatureUploadedAt,
  seededSignatures,
  type SeedDoctorKey,
  type SeedDoctorPlan,
  type SeedStaffKey,
  type SeedStaffPlan,
} from './seed-clinic-users-factory';

function getDoctorPlan(key: SeedDoctorKey): SeedDoctorPlan {
  const plan = SEED_DOCTOR_PLANS.find((p) => p.key === key);
  if (!plan) throw new Error(`Unknown seed doctor key: ${key}`);
  return plan;
}

function getStaffPlan(key: SeedStaffKey): SeedStaffPlan {
  const plan = SEED_STAFF_PLANS.find((p) => p.key === key);
  if (!plan) throw new Error(`Unknown seed staff key: ${key}`);
  return plan;
}

function buildDoctorCreateData(
  plan: SeedDoctorPlan,
  clinicId: string,
  hashedPassword: string,
) {
  return {
    email: plan.email,
    password: hashedPassword,
    name: plan.name,
    role: plan.role,
    clinicId,
    specialization: plan.specialization,
    hospitalRole: plan.hospitalRole,
    qualification: plan.qualification,
    registrationNumber: plan.registrationNumber,
    licenseNumber: plan.licenseNumber,
    phoneNumber: plan.phoneNumber,
    bio: plan.bio,
    yearsOfExperience: plan.yearsOfExperience,
    consultationFee: plan.consultationFee,
    ...(plan.signatureUrl
      ? {
          signatureUrl: plan.signatureUrl,
          signatureUploadedAt: seededSignatureUploadedAt,
        }
      : {}),
    emailVerified: true,
  };
}

type SeedEntityRef = { id: string };
type SeedDoctorRefs = {
  adminDoctor: SeedEntityRef;
  doctor1: SeedEntityRef;
  doctor2: SeedEntityRef;
  doctor3: SeedEntityRef;
};
type SeedStaffRefs = {
  nurse: SeedEntityRef;
  nurse2: SeedEntityRef;
  receptionist: SeedEntityRef;
  receptionist2: SeedEntityRef;
};

export interface SeedClinicUsersResult {
  defaultClinic: SeedEntityRef;
  clinicAdmin: SeedEntityRef;
  adminDoctor: SeedEntityRef;
  nurse: SeedEntityRef;
  nurse2: SeedEntityRef;
  receptionist: SeedEntityRef;
  receptionist2: SeedEntityRef;
  patientPortalUser: SeedEntityRef;
  pendingNoClinicUser: SeedEntityRef;
  doctor1: SeedEntityRef;
  doctor2: SeedEntityRef;
  doctor3: SeedEntityRef;
}

export async function seedClinicUsers(
  prisma: PrismaClient,
): Promise<SeedClinicUsersResult> {
  const defaultClinic = await seedDefaultClinic(prisma);
  const hashedPassword = await bcrypt.hash('password123', 10);

  await seedInternalUser(prisma, hashedPassword);
  const clinicAdmin = await seedClinicAdmin(
    prisma,
    defaultClinic.id,
    hashedPassword,
  );
  const doctors = await seedDoctors(prisma, defaultClinic.id, hashedPassword);
  await seedDoctorProfileDetails(prisma, defaultClinic.id, doctors);
  const staff = await seedClinicStaff(prisma, defaultClinic.id, hashedPassword);
  const patientPortalUser = await seedPatientPortalUser(prisma, hashedPassword);
  const pendingNoClinicUser = await seedPendingNoClinicUser(
    prisma,
    hashedPassword,
  );

  return {
    defaultClinic,
    clinicAdmin,
    adminDoctor: doctors.adminDoctor,
    nurse: staff.nurse,
    nurse2: staff.nurse2,
    receptionist: staff.receptionist,
    receptionist2: staff.receptionist2,
    patientPortalUser,
    pendingNoClinicUser,
    doctor1: doctors.doctor1,
    doctor2: doctors.doctor2,
    doctor3: doctors.doctor3,
  };
}

async function seedDefaultClinic(prisma: PrismaClient): Promise<SeedEntityRef> {
  const clinic = await prisma.clinic.upsert({
    where: { id: SEED_DEFAULT_CLINIC_PLAN.id },
    update: {
      name: SEED_DEFAULT_CLINIC_PLAN.name,
      address: SEED_DEFAULT_CLINIC_PLAN.address,
      phone: SEED_DEFAULT_CLINIC_PLAN.phone,
      email: SEED_DEFAULT_CLINIC_PLAN.email,
      active: SEED_DEFAULT_CLINIC_PLAN.active,
      tier: SEED_DEFAULT_CLINIC_PLAN.tier,
      planMode: SEED_DEFAULT_CLINIC_PLAN.planMode,
    },
    create: { ...SEED_DEFAULT_CLINIC_PLAN },
  });
  return { id: clinic.id };
}

async function seedInternalUser(
  prisma: PrismaClient,
  hashedPassword: string,
): Promise<void> {
  await prisma.user.upsert({
    where: { email: 'admin@docita.work' },
    update: {
      signatureUrl: seededSignatures.internal,
      signatureUploadedAt: seededSignatureUploadedAt,
      emailVerified: true,
    },
    create: {
      email: 'admin@docita.work',
      password: hashedPassword,
      name: 'Internal',
      role: 'INTERNAL',
      clinicId: null,
      signatureUrl: seededSignatures.internal,
      signatureUploadedAt: seededSignatureUploadedAt,
      emailVerified: true,
    },
  });
}

async function seedClinicAdmin(
  prisma: PrismaClient,
  clinicId: string,
  hashedPassword: string,
): Promise<SeedEntityRef> {
  const user = await prisma.user.upsert({
    where: { email: 'clinic.admin@docita.work' },
    update: {
      signatureUrl: seededSignatures.clinicAdmin,
      signatureUploadedAt: seededSignatureUploadedAt,
      emailVerified: true,
    },
    create: {
      email: 'clinic.admin@docita.work',
      password: hashedPassword,
      name: 'Clinic Administrator',
      role: 'ADMIN',
      clinicId,
      signatureUrl: seededSignatures.clinicAdmin,
      signatureUploadedAt: seededSignatureUploadedAt,
      emailVerified: true,
    },
  });
  return { id: user.id };
}

async function seedDoctors(
  prisma: PrismaClient,
  clinicId: string,
  hashedPassword: string,
): Promise<SeedDoctorRefs> {
  const adminDoctor = await seedDoctorFromPlan(
    prisma,
    clinicId,
    hashedPassword,
    'adminDoctor',
  );
  const doctor1 = await seedDoctorFromPlan(
    prisma,
    clinicId,
    hashedPassword,
    'doctor1',
  );
  const doctor2 = await seedDoctorFromPlan(
    prisma,
    clinicId,
    hashedPassword,
    'doctor2',
  );
  const doctor3 = await seedDoctorFromPlan(
    prisma,
    clinicId,
    hashedPassword,
    'doctor3',
  );

  return { adminDoctor, doctor1, doctor2, doctor3 };
}

async function seedDoctorFromPlan(
  prisma: PrismaClient,
  clinicId: string,
  hashedPassword: string,
  key: SeedDoctorKey,
): Promise<SeedEntityRef> {
  const plan = getDoctorPlan(key);
  const user = await prisma.user.upsert({
    where: { email: plan.email },
    update: {
      // Refresh the signature fields on re-run for signed doctors, matching
      // the original per-doctor upsert behavior (doctor2/3 have no signature).
      ...(plan.signatureUrl
        ? {
            signatureUrl: plan.signatureUrl,
            signatureUploadedAt: seededSignatureUploadedAt,
          }
        : {}),
      emailVerified: true,
    },
    create: buildDoctorCreateData(plan, clinicId, hashedPassword),
  });
  return { id: user.id };
}

async function seedDoctorProfileDetails(
  prisma: PrismaClient,
  clinicId: string,
  doctors: SeedDoctorRefs,
): Promise<void> {
  const { adminDoctor, doctor1, doctor2, doctor3 } = doctors;
  const profileDoctorIds = [doctor1.id, doctor2.id, doctor3.id];
  const clinicDoctorIds = [doctor1.id, doctor2.id, doctor3.id, adminDoctor.id];

  await seedDoctorEducation(prisma, profileDoctorIds, doctors);
  await seedDoctorCertifications(prisma, profileDoctorIds, doctors);
  await seedDoctorSpecializations(prisma, clinicDoctorIds, doctors);
  await seedDoctorClinicLinks(prisma, clinicId, clinicDoctorIds, doctors);
}

async function seedDoctorEducation(
  prisma: PrismaClient,
  profileDoctorIds: string[],
  doctors: SeedDoctorRefs,
): Promise<void> {
  await prisma.doctorEducation.deleteMany({
    where: { doctorId: { in: profileDoctorIds } },
  });

  await prisma.doctorEducation.createMany({
    data: getDoctorEducationRows(doctors),
  });
}

function getDoctorEducationRows(doctors: SeedDoctorRefs) {
  return [
    ...getPrimaryDoctorEducationRows(doctors.doctor1.id),
    ...getPediatricDoctorEducationRows(doctors.doctor2.id),
    ...getDentalDoctorEducationRows(doctors.doctor3.id),
  ];
}

function getPrimaryDoctorEducationRows(doctorId: string) {
  return [
    {
      doctorId,
      degree: 'MBBS',
      fieldOfStudy: 'Medicine',
      institution: 'Bangalore Medical College',
      location: 'Bangalore, India',
      startYear: 2005,
      endYear: 2010,
      order: 1,
    },
    {
      doctorId,
      degree: 'MD',
      fieldOfStudy: 'Cardiology',
      institution: 'AIIMS Delhi',
      location: 'New Delhi, India',
      startYear: 2011,
      endYear: 2014,
      order: 2,
    },
    {
      doctorId,
      degree: 'DM',
      fieldOfStudy: 'Interventional Cardiology',
      institution: 'SCTIMST Trivandrum',
      location: 'Kerala, India',
      startYear: 2014,
      endYear: 2017,
      order: 3,
    },
  ];
}

function getPediatricDoctorEducationRows(doctorId: string) {
  return [
    {
      doctorId,
      degree: 'MBBS',
      fieldOfStudy: 'Medicine',
      institution: 'St. Johns Medical College',
      location: 'Bangalore, India',
      startYear: 2012,
      endYear: 2017,
      order: 1,
    },
    {
      doctorId,
      degree: 'DCH',
      fieldOfStudy: 'Child Health',
      institution: 'Indira Gandhi Medical College',
      location: 'Shimla, India',
      startYear: 2017,
      endYear: 2019,
      order: 2,
    },
    {
      doctorId,
      degree: 'MD',
      fieldOfStudy: 'Pediatrics',
      institution: 'Manipal Academy of Higher Education',
      location: 'Manipal, India',
      startYear: 2019,
      endYear: 2022,
      order: 3,
    },
  ];
}

function getDentalDoctorEducationRows(doctorId: string) {
  return [
    {
      doctorId,
      degree: 'BDS',
      fieldOfStudy: 'Dental Surgery',
      institution: 'SDM College of Dental Sciences',
      location: 'Dharwad, India',
      startYear: 2008,
      endYear: 2013,
      order: 1,
    },
    {
      doctorId,
      degree: 'MDS',
      fieldOfStudy: 'Orthodontics & Dentofacial Orthopedics',
      institution: 'MCODS Manipal',
      location: 'Manipal, India',
      startYear: 2014,
      endYear: 2017,
      order: 2,
    },
  ];
}

async function seedDoctorCertifications(
  prisma: PrismaClient,
  profileDoctorIds: string[],
  doctors: SeedDoctorRefs,
): Promise<void> {
  await prisma.doctorCertification.deleteMany({
    where: { doctorId: { in: profileDoctorIds } },
  });

  await prisma.doctorCertification.createMany({
    data: getDoctorCertificationRows(doctors),
  });
}

function getDoctorCertificationRows(doctors: SeedDoctorRefs) {
  const { doctor1, doctor2, doctor3 } = doctors;
  return [
    {
      doctorId: doctor1.id,
      name: 'Advanced Cardiac Life Support (ACLS)',
      issuingBody: 'American Heart Association',
      issueDate: new Date('2020-03-15'),
      expiryDate: new Date('2025-03-15'),
      credentialId: 'AHA-ACLS-2020-123456',
    },
    {
      doctorId: doctor1.id,
      name: 'Fellowship in Interventional Cardiology',
      issuingBody: 'Cardiological Society of India',
      issueDate: new Date('2018-06-20'),
      credentialId: 'CSI-FIC-2018-789',
    },
    {
      doctorId: doctor2.id,
      name: 'Pediatric Advanced Life Support (PALS)',
      issuingBody: 'American Heart Association',
      issueDate: new Date('2021-05-10'),
      expiryDate: new Date('2026-05-10'),
      credentialId: 'AHA-PALS-2021-654341',
    },
    {
      doctorId: doctor2.id,
      name: 'Neonatal Resuscitation Program (NRP)',
      issuingBody: 'American Academy of Pediatrics',
      issueDate: new Date('2022-01-25'),
      expiryDate: new Date('2025-01-25'),
      credentialId: 'AAP-NRP-2022-456',
    },
    {
      doctorId: doctor3.id,
      name: 'Invisalign Certified Provider',
      issuingBody: 'Align Technology',
      issueDate: new Date('2019-08-12'),
      credentialId: 'INV-CERT-2019-789012',
    },
    {
      doctorId: doctor3.id,
      name: 'Dental Implantology Certificate',
      issuingBody: 'Indian Dental Association',
      issueDate: new Date('2020-11-05'),
      credentialId: 'IDA-IMP-2020-345',
    },
  ];
}

async function seedDoctorSpecializations(
  prisma: PrismaClient,
  clinicDoctorIds: string[],
  doctors: SeedDoctorRefs,
): Promise<void> {
  const { adminDoctor, doctor1, doctor2, doctor3 } = doctors;

  await prisma.doctorSpecialization.deleteMany({
    where: {
      doctorId: { in: clinicDoctorIds },
    },
  });

  await prisma.doctorSpecialization.createMany({
    data: [
      {
        doctorId: doctor1.id,
        specialization: 'CARDIOLOGY',
        isPrimary: true,
        yearsOfPractice: 10,
      },
      {
        doctorId: doctor1.id,
        specialization: 'INTERNAL_MEDICINE',
        isPrimary: false,
        yearsOfPractice: 12,
      },
      {
        doctorId: doctor2.id,
        specialization: 'PEDIATRICS',
        isPrimary: true,
        yearsOfPractice: 6,
      },
      {
        doctorId: adminDoctor.id,
        specialization: 'GENERAL_PRACTICE',
        isPrimary: true,
        yearsOfPractice: 15,
      },
      {
        doctorId: doctor3.id,
        specialization: 'DENTAL',
        isPrimary: true,
        yearsOfPractice: 8,
      },
    ],
  });
}

async function seedDoctorClinicLinks(
  prisma: PrismaClient,
  clinicId: string,
  clinicDoctorIds: string[],
  doctors: SeedDoctorRefs,
): Promise<void> {
  const { adminDoctor, doctor1, doctor2, doctor3 } = doctors;

  await prisma.doctorClinic.deleteMany({
    where: {
      doctorId: { in: clinicDoctorIds },
    },
  });

  await prisma.doctorClinic.createMany({
    data: [
      {
        doctorId: doctor1.id,
        clinicId,
        role: 'doctor',
        active: true,
      },
      {
        doctorId: doctor2.id,
        clinicId,
        role: 'doctor',
        active: true,
      },
      {
        doctorId: doctor3.id,
        clinicId,
        role: 'doctor',
        active: true,
      },
      {
        doctorId: adminDoctor.id,
        clinicId,
        role: 'doctor',
        active: true,
      },
    ],
  });
}

async function seedClinicStaff(
  prisma: PrismaClient,
  clinicId: string,
  hashedPassword: string,
): Promise<SeedStaffRefs> {
  const receptionist = await seedStaffFromPlan(
    prisma,
    clinicId,
    hashedPassword,
    'receptionist',
  );
  const nurse = await seedStaffFromPlan(
    prisma,
    clinicId,
    hashedPassword,
    'nurse',
  );
  const nurse2 = await seedStaffFromPlan(
    prisma,
    clinicId,
    hashedPassword,
    'nurse2',
  );
  const receptionist2 = await seedStaffFromPlan(
    prisma,
    clinicId,
    hashedPassword,
    'receptionist2',
  );

  return { nurse, nurse2, receptionist, receptionist2 };
}

async function seedStaffFromPlan(
  prisma: PrismaClient,
  clinicId: string,
  hashedPassword: string,
  key: SeedStaffKey,
): Promise<SeedEntityRef> {
  const plan = getStaffPlan(key);
  const user = await prisma.user.upsert({
    where: { email: plan.email },
    update: {
      clinicId,
      emailVerified: true,
    },
    create: {
      email: plan.email,
      password: hashedPassword,
      name: plan.name,
      role: plan.role,
      clinicId,
      ...(plan.phoneNumber ? { phoneNumber: plan.phoneNumber } : {}),
      emailVerified: true,
    },
  });
  return { id: user.id };
}

async function seedPatientPortalUser(
  prisma: PrismaClient,
  hashedPassword: string,
): Promise<SeedEntityRef> {
  const patientPortalUser = await prisma.user.upsert({
    where: { email: 'patient.portal@docita.work' },
    update: {
      emailVerified: true,
      phoneNumber: SEED_PATIENT_PHONE_NUMBER_E164,
    },
    create: {
      email: 'patient.portal@docita.work',
      password: hashedPassword,
      name: 'Rajesh Kumar',
      role: 'PATIENT',
      clinicId: null,
      phoneNumber: SEED_PATIENT_PHONE_NUMBER_E164,
      emailVerified: true,
    },
  });
  return { id: patientPortalUser.id };
}

async function seedPendingNoClinicUser(
  prisma: PrismaClient,
  hashedPassword: string,
): Promise<SeedEntityRef> {
  const pendingNoClinicUser = await prisma.user.upsert({
    where: { email: 'pending.user@docita.work' },
    update: {
      clinicId: null,
      role: 'DOCTOR',
      emailVerified: true,
      onboardingStep: 'CHOOSE_PATH',
    },
    create: {
      email: 'pending.user@docita.work',
      password: hashedPassword,
      name: 'Pending Clinic User',
      role: 'DOCTOR',
      clinicId: null,
      emailVerified: true,
      onboardingStep: 'CHOOSE_PATH',
      onboardingStartedAt: new Date('2026-02-01T09:00:00.000Z'),
    },
  });
  return { id: pendingNoClinicUser.id };
}
