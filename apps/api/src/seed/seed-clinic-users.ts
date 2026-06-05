import { PlanMode, PrismaClient } from '@workspace/db';
import * as bcrypt from 'bcrypt';
import { SEED_PATIENT_PHONE_NUMBER_E164 } from './seed-constants';

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

const seededSignatureUploadedAt = new Date('2026-01-01T00:00:00.000Z');
const seededSignatures = {
  internal:
    'https://placehold.co/300x100/000000/FFFFFF?text=Super+Admin+Signature',
  clinicAdmin:
    'https://placehold.co/300x100/000000/FFFFFF?text=Clinic+Admin+Signature',
  adminDoctor:
    'https://placehold.co/300x100/000000/FFFFFF?text=Dr+Admin+Doctor',
  doctor: 'https://placehold.co/300x100/000000/FFFFFF?text=Dr+Vamsi+Krishna',
} as const;

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
    where: { id: 'default-clinic-id' },
    update: {
      name: 'Docita General Hospital',
      address: '1 Hospital Avenue, Whitefield, Bangalore, Karnataka 560066',
      phone: '+91 80 4000 5000',
      email: 'contact@docita.work',
      active: true,
      tier: 'ENTERPRISE',
      planMode: PlanMode.FULL,
    },
    create: {
      id: 'default-clinic-id',
      name: 'Docita General Hospital',
      address: '1 Hospital Avenue, Whitefield, Bangalore, Karnataka 560066',
      phone: '+91 80 4000 5000',
      email: 'contact@docita.work',
      active: true,
      tier: 'ENTERPRISE',
      planMode: PlanMode.FULL,
    },
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
  const adminDoctor = await seedAdminDoctor(prisma, clinicId, hashedPassword);
  const doctor1 = await seedPrimaryDoctor(prisma, clinicId, hashedPassword);
  const doctor2 = await seedPediatricDoctor(prisma, clinicId, hashedPassword);
  const doctor3 = await seedDentalDoctor(prisma, clinicId, hashedPassword);

  return { adminDoctor, doctor1, doctor2, doctor3 };
}

async function seedAdminDoctor(
  prisma: PrismaClient,
  clinicId: string,
  hashedPassword: string,
): Promise<SeedEntityRef> {
  const adminDoctor = await prisma.user.upsert({
    where: { email: 'admin.doctor@docita.work' },
    update: {
      signatureUrl: seededSignatures.adminDoctor,
      signatureUploadedAt: seededSignatureUploadedAt,
      emailVerified: true,
    },
    create: {
      email: 'admin.doctor@docita.work',
      password: hashedPassword,
      name: 'Admin Doctor',
      role: 'ADMIN_DOCTOR',
      clinicId,
      specialization: 'GENERAL_PRACTICE',
      hospitalRole: 'MEDICAL_DIRECTOR',
      qualification: 'MBBS, MD (General Medicine)',
      registrationNumber: 'KMC-2010-99887',
      licenseNumber: 'KA-MED-2010-009988',
      phoneNumber: '+91 9876543009',
      bio: 'Medical Director with extensive experience in hospital administration and general practice.',
      yearsOfExperience: 15,
      consultationFee: 2000,
      signatureUrl: seededSignatures.adminDoctor,
      signatureUploadedAt: seededSignatureUploadedAt,
      emailVerified: true,
    },
  });
  return { id: adminDoctor.id };
}

async function seedPrimaryDoctor(
  prisma: PrismaClient,
  clinicId: string,
  hashedPassword: string,
): Promise<SeedEntityRef> {
  const doctor1 = await prisma.user.upsert({
    where: { email: 'doctor@docita.work' },
    update: {
      signatureUrl: seededSignatures.doctor,
      signatureUploadedAt: seededSignatureUploadedAt,
      emailVerified: true,
    },
    create: {
      email: 'doctor@docita.work',
      password: hashedPassword,
      name: 'Vamsi Krishna',
      role: 'DOCTOR',
      clinicId,
      specialization: 'CARDIOLOGY',
      hospitalRole: 'SENIOR_CONSULTANT',
      qualification: 'MBBS, MD (Cardiology)',
      registrationNumber: 'KMC-2015-12345',
      licenseNumber: 'KA-MED-2015-001234',
      phoneNumber: '+91 9876543001',
      bio: 'Senior Cardiologist with over 10 years of experience in interventional cardiology. Specializes in complex cardiac procedures and heart failure management.',
      yearsOfExperience: 10,
      consultationFee: 1500,
      signatureUrl: seededSignatures.doctor,
      signatureUploadedAt: seededSignatureUploadedAt,
      emailVerified: true,
    },
  });
  return { id: doctor1.id };
}

async function seedPediatricDoctor(
  prisma: PrismaClient,
  clinicId: string,
  hashedPassword: string,
): Promise<SeedEntityRef> {
  const doctor2 = await prisma.user.upsert({
    where: { email: 'dr.sharma@docita.work' },
    update: { emailVerified: true },
    create: {
      email: 'dr.sharma@docita.work',
      password: hashedPassword,
      name: 'Priya Sharma',
      role: 'DOCTOR',
      clinicId,
      specialization: 'PEDIATRICS',
      hospitalRole: 'CONSULTANT',
      qualification: 'MBBS, DCH, MD (Pediatrics)',
      registrationNumber: 'KMC-2018-54341',
      licenseNumber: 'KA-MED-2018-005678',
      phoneNumber: '+91 9876543002',
      bio: 'Pediatrician specializing in newborn care, childhood vaccinations, and developmental pediatrics. Committed to providing compassionate care for children.',
      yearsOfExperience: 6,
      consultationFee: 1000,
      emailVerified: true,
    },
  });
  return { id: doctor2.id };
}

async function seedDentalDoctor(
  prisma: PrismaClient,
  clinicId: string,
  hashedPassword: string,
): Promise<SeedEntityRef> {
  const doctor3 = await prisma.user.upsert({
    where: { email: 'dr.dental@docita.work' },
    update: { emailVerified: true },
    create: {
      email: 'dr.dental@docita.work',
      password: hashedPassword,
      name: 'Arun Menon',
      role: 'DOCTOR',
      clinicId,
      specialization: 'DENTAL',
      hospitalRole: 'CONSULTANT',
      qualification: 'BDS, MDS (Orthodontics)',
      registrationNumber: 'KDC-2016-67890',
      licenseNumber: 'KA-DEN-2016-002345',
      phoneNumber: '+91 9876543003',
      bio: 'Dental specialist with expertise in orthodontics, dental implants, and cosmetic dentistry. Uses latest technology for painless treatments.',
      yearsOfExperience: 8,
      consultationFee: 800,
      emailVerified: true,
    },
  });
  return { id: doctor3.id };
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
  const receptionist = await seedReceptionist(prisma, clinicId, hashedPassword);
  const nurse = await seedNurse(prisma, clinicId, hashedPassword);
  const nurse2 = await seedSecondNurse(prisma, clinicId, hashedPassword);
  const receptionist2 = await seedFrontDeskUser(
    prisma,
    clinicId,
    hashedPassword,
  );

  return { nurse, nurse2, receptionist, receptionist2 };
}

async function seedReceptionist(
  prisma: PrismaClient,
  clinicId: string,
  hashedPassword: string,
): Promise<SeedEntityRef> {
  const receptionist = await prisma.user.upsert({
    where: { email: 'reception@docita.work' },
    update: {
      clinicId,
      emailVerified: true,
    },
    create: {
      email: 'reception@docita.work',
      password: hashedPassword,
      name: 'Anjali Reddy',
      role: 'RECEPTIONIST',
      clinicId,
      emailVerified: true,
    },
  });
  return { id: receptionist.id };
}

async function seedNurse(
  prisma: PrismaClient,
  clinicId: string,
  hashedPassword: string,
): Promise<SeedEntityRef> {
  const nurse = await prisma.user.upsert({
    where: { email: 'nurse@docita.work' },
    update: {
      clinicId,
      emailVerified: true,
    },
    create: {
      email: 'nurse@docita.work',
      password: hashedPassword,
      name: 'Nurse Kavya',
      role: 'NURSE',
      clinicId,
      phoneNumber: '+91 9876543010',
      emailVerified: true,
    },
  });
  return { id: nurse.id };
}

async function seedSecondNurse(
  prisma: PrismaClient,
  clinicId: string,
  hashedPassword: string,
): Promise<SeedEntityRef> {
  const nurse2 = await prisma.user.upsert({
    where: { email: 'nurse.priya@docita.work' },
    update: {
      clinicId,
      emailVerified: true,
    },
    create: {
      email: 'nurse.priya@docita.work',
      password: hashedPassword,
      name: 'Nurse Priya',
      role: 'NURSE',
      clinicId,
      phoneNumber: '+91 9876543011',
      emailVerified: true,
    },
  });
  return { id: nurse2.id };
}

async function seedFrontDeskUser(
  prisma: PrismaClient,
  clinicId: string,
  hashedPassword: string,
): Promise<SeedEntityRef> {
  const receptionist2 = await prisma.user.upsert({
    where: { email: 'reception.front@docita.work' },
    update: {
      clinicId,
      emailVerified: true,
    },
    create: {
      email: 'reception.front@docita.work',
      password: hashedPassword,
      name: 'Front Desk Meera',
      role: 'RECEPTIONIST',
      clinicId,
      phoneNumber: '+91 9876543012',
      emailVerified: true,
    },
  });
  return { id: receptionist2.id };
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
