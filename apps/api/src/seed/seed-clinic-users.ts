import { PrismaClient } from '@workspace/db';
import * as bcrypt from 'bcrypt';

type SeedEntityRef = { id: string };

export interface SeedClinicUsersResult {
  defaultClinic: SeedEntityRef;
  doctor1: SeedEntityRef;
  doctor2: SeedEntityRef;
  doctor3: SeedEntityRef;
}

export async function seedClinicUsers(
  prisma: PrismaClient,
): Promise<SeedClinicUsersResult> {
  const defaultClinic = await prisma.clinic.upsert({
    where: { id: 'default-clinic-id' },
    update: {},
    create: {
      id: 'default-clinic-id',
      name: 'Docita Health Clinic',
      address: '123 Health Street, Bangalore, Karnataka 560001',
      phone: '+91 80 1234 5678',
      email: 'contact@docita.work',
      active: true,
      tier: 'PRO',
    },
  });

  console.log('Default clinic created');

  const hashedPassword = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@docita.work' },
    update: {},
    create: {
      email: 'admin@docita.work',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      clinicId: null,
    },
  });

  await prisma.user.upsert({
    where: { email: 'clinic.admin@docita.work' },
    update: {},
    create: {
      email: 'clinic.admin@docita.work',
      password: hashedPassword,
      name: 'Clinic Administrator',
      role: 'ADMIN',
      clinicId: defaultClinic.id,
    },
  });

  const adminDoctor = await prisma.user.upsert({
    where: { email: 'admin.doctor@docita.work' },
    update: {},
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
    },
  });

  const doctor1 = await prisma.user.upsert({
    where: { email: 'doctor@docita.work' },
    update: {},
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
    },
  });

  const doctor2 = await prisma.user.upsert({
    where: { email: 'dr.sharma@docita.work' },
    update: {},
    create: {
      email: 'dr.sharma@docita.work',
      password: hashedPassword,
      name: 'Priya Sharma',
      role: 'DOCTOR',
      clinicId: defaultClinic.id,
      specialization: 'PEDIATRICS',
      hospitalRole: 'CONSULTANT',
      qualification: 'MBBS, DCH, MD (Pediatrics)',
      registrationNumber: 'KMC-2018-54321',
      licenseNumber: 'KA-MED-2018-005678',
      phoneNumber: '+91 9876543002',
      bio: 'Pediatrician specializing in newborn care, childhood vaccinations, and developmental pediatrics. Committed to providing compassionate care for children.',
      yearsOfExperience: 6,
      consultationFee: 1000,
    },
  });

  const doctor3 = await prisma.user.upsert({
    where: { email: 'dr.dental@docita.work' },
    update: {},
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
        credentialId: 'AHA-PALS-2021-654321',
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

  console.log('Doctor profiles with education and certifications created');
  console.log('DoctorClinic associations created');

  await prisma.user.upsert({
    where: { email: 'reception@docita.work' },
    update: {},
    create: {
      email: 'reception@docita.work',
      password: hashedPassword,
      name: 'Anjali Reddy',
      role: 'RECEPTIONIST',
      clinicId: defaultClinic.id,
    },
  });

  console.log('Users created (including Super Admin)');

  return {
    defaultClinic: { id: defaultClinic.id },
    doctor1: { id: doctor1.id },
    doctor2: { id: doctor2.id },
    doctor3: { id: doctor3.id },
  };
}
