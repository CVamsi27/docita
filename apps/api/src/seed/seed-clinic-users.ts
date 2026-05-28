import { PrismaClient } from '@workspace/db';
import * as bcrypt from 'bcrypt';

type SeedEntityRef = { id: string };

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

  const defaultClinic = await prisma.clinic.upsert({
    where: { id: 'default-clinic-id' },
    update: {
      name: 'Docita General Hospital',
      address: '1 Hospital Avenue, Whitefield, Bangalore, Karnataka 560066',
      phone: '+91 80 4000 5000',
      email: 'contact@docita.work',
      active: true,
      tier: 'ENTERPRISE',
    },
    create: {
      id: 'default-clinic-id',
      name: 'Docita General Hospital',
      address: '1 Hospital Avenue, Whitefield, Bangalore, Karnataka 560066',
      phone: '+91 80 4000 5000',
      email: 'contact@docita.work',
      active: true,
      tier: 'ENTERPRISE',
    },
  });

  const hashedPassword = await bcrypt.hash('password123', 10);

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

  const clinicAdmin = await prisma.user.upsert({
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
      clinicId: defaultClinic.id,
      signatureUrl: seededSignatures.clinicAdmin,
      signatureUploadedAt: seededSignatureUploadedAt,
      emailVerified: true,
    },
  });

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
      clinicId: defaultClinic.id,
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
      clinicId: defaultClinic.id,
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

  const doctor2 = await prisma.user.upsert({
    where: { email: 'dr.sharma@docita.work' },
    update: { emailVerified: true },
    create: {
      email: 'dr.sharma@docita.work',
      password: hashedPassword,
      name: 'Priya Sharma',
      role: 'DOCTOR',
      clinicId: defaultClinic.id,
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

  const doctor3 = await prisma.user.upsert({
    where: { email: 'dr.dental@docita.work' },
    update: { emailVerified: true },
    create: {
      email: 'dr.dental@docita.work',
      password: hashedPassword,
      name: 'Arun Menon',
      role: 'DOCTOR',
      clinicId: defaultClinic.id,
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

  await prisma.doctorEducation.deleteMany({
    where: { doctorId: { in: [doctor1.id, doctor2.id, doctor3.id] } },
  });

  await prisma.doctorEducation.createMany({
    data: [
      {
        doctorId: doctor1.id,
        degree: 'MBBS',
        fieldOfStudy: 'Medicine',
        institution: 'Bangalore Medical College',
        location: 'Bangalore, India',
        startYear: 2005,
        endYear: 2010,
        order: 1,
      },
      {
        doctorId: doctor1.id,
        degree: 'MD',
        fieldOfStudy: 'Cardiology',
        institution: 'AIIMS Delhi',
        location: 'New Delhi, India',
        startYear: 2011,
        endYear: 2014,
        order: 2,
      },
      {
        doctorId: doctor1.id,
        degree: 'DM',
        fieldOfStudy: 'Interventional Cardiology',
        institution: 'SCTIMST Trivandrum',
        location: 'Kerala, India',
        startYear: 2014,
        endYear: 2017,
        order: 3,
      },
      {
        doctorId: doctor2.id,
        degree: 'MBBS',
        fieldOfStudy: 'Medicine',
        institution: 'St. Johns Medical College',
        location: 'Bangalore, India',
        startYear: 2012,
        endYear: 2017,
        order: 1,
      },
      {
        doctorId: doctor2.id,
        degree: 'DCH',
        fieldOfStudy: 'Child Health',
        institution: 'Indira Gandhi Medical College',
        location: 'Shimla, India',
        startYear: 2017,
        endYear: 2019,
        order: 2,
      },
      {
        doctorId: doctor2.id,
        degree: 'MD',
        fieldOfStudy: 'Pediatrics',
        institution: 'Manipal Academy of Higher Education',
        location: 'Manipal, India',
        startYear: 2019,
        endYear: 2022,
        order: 3,
      },
      {
        doctorId: doctor3.id,
        degree: 'BDS',
        fieldOfStudy: 'Dental Surgery',
        institution: 'SDM College of Dental Sciences',
        location: 'Dharwad, India',
        startYear: 2008,
        endYear: 2013,
        order: 1,
      },
      {
        doctorId: doctor3.id,
        degree: 'MDS',
        fieldOfStudy: 'Orthodontics & Dentofacial Orthopedics',
        institution: 'MCODS Manipal',
        location: 'Manipal, India',
        startYear: 2014,
        endYear: 2017,
        order: 2,
      },
    ],
  });

  await prisma.doctorCertification.deleteMany({
    where: { doctorId: { in: [doctor1.id, doctor2.id, doctor3.id] } },
  });

  await prisma.doctorCertification.createMany({
    data: [
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
    ],
  });

  await prisma.doctorSpecialization.deleteMany({
    where: {
      doctorId: { in: [doctor1.id, doctor2.id, doctor3.id, adminDoctor.id] },
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

  await prisma.doctorClinic.deleteMany({
    where: {
      doctorId: { in: [doctor1.id, doctor2.id, doctor3.id, adminDoctor.id] },
    },
  });

  await prisma.doctorClinic.createMany({
    data: [
      {
        doctorId: doctor1.id,
        clinicId: defaultClinic.id,
        role: 'doctor',
        active: true,
      },
      {
        doctorId: doctor2.id,
        clinicId: defaultClinic.id,
        role: 'doctor',
        active: true,
      },
      {
        doctorId: doctor3.id,
        clinicId: defaultClinic.id,
        role: 'doctor',
        active: true,
      },
      {
        doctorId: adminDoctor.id,
        clinicId: defaultClinic.id,
        role: 'doctor',
        active: true,
      },
    ],
  });

  const receptionist = await prisma.user.upsert({
    where: { email: 'reception@docita.work' },
    update: {
      clinicId: defaultClinic.id,
      emailVerified: true,
    },
    create: {
      email: 'reception@docita.work',
      password: hashedPassword,
      name: 'Anjali Reddy',
      role: 'RECEPTIONIST',
      clinicId: defaultClinic.id,
      emailVerified: true,
    },
  });

  const nurse = await prisma.user.upsert({
    where: { email: 'nurse@docita.work' },
    update: {
      clinicId: defaultClinic.id,
      emailVerified: true,
    },
    create: {
      email: 'nurse@docita.work',
      password: hashedPassword,
      name: 'Nurse Kavya',
      role: 'NURSE',
      clinicId: defaultClinic.id,
      phoneNumber: '+91 9876543010',
      emailVerified: true,
    },
  });

  const nurse2 = await prisma.user.upsert({
    where: { email: 'nurse.priya@docita.work' },
    update: {
      clinicId: defaultClinic.id,
      emailVerified: true,
    },
    create: {
      email: 'nurse.priya@docita.work',
      password: hashedPassword,
      name: 'Nurse Priya',
      role: 'NURSE',
      clinicId: defaultClinic.id,
      phoneNumber: '+91 9876543011',
      emailVerified: true,
    },
  });

  const receptionist2 = await prisma.user.upsert({
    where: { email: 'reception.front@docita.work' },
    update: {
      clinicId: defaultClinic.id,
      emailVerified: true,
    },
    create: {
      email: 'reception.front@docita.work',
      password: hashedPassword,
      name: 'Front Desk Meera',
      role: 'RECEPTIONIST',
      clinicId: defaultClinic.id,
      phoneNumber: '+91 9876543012',
      emailVerified: true,
    },
  });

  const patientPortalUser = await prisma.user.upsert({
    where: { email: 'patient.portal@docita.work' },
    update: {
      emailVerified: true,
    },
    create: {
      email: 'patient.portal@docita.work',
      password: hashedPassword,
      name: 'Rajesh Kumar',
      role: 'PATIENT',
      clinicId: null,
      phoneNumber: '+91 9876543410',
      emailVerified: true,
    },
  });

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

  return {
    defaultClinic: { id: defaultClinic.id },
    clinicAdmin: { id: clinicAdmin.id },
    adminDoctor: { id: adminDoctor.id },
    nurse: { id: nurse.id },
    nurse2: { id: nurse2.id },
    receptionist: { id: receptionist.id },
    receptionist2: { id: receptionist2.id },
    patientPortalUser: { id: patientPortalUser.id },
    pendingNoClinicUser: { id: pendingNoClinicUser.id },
    doctor1: { id: doctor1.id },
    doctor2: { id: doctor2.id },
    doctor3: { id: doctor3.id },
  };
}
