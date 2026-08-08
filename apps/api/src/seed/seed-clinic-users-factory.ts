import type {
  HospitalRole,
  PlanMode,
  Role,
  Specialization,
} from '@workspace/db';

export const seededSignatureUploadedAt = new Date('2026-01-01T00:00:00.000Z');

export const seededSignatures = {
  internal:
    'https://placehold.co/300x100/000000/FFFFFF?text=Super+Admin+Signature',
  clinicAdmin:
    'https://placehold.co/300x100/000000/FFFFFF?text=Clinic+Admin+Signature',
  adminDoctor:
    'https://placehold.co/300x100/000000/FFFFFF?text=Dr+Admin+Doctor',
  doctor: 'https://placehold.co/300x100/000000/FFFFFF?text=Dr+Vamsi+Krishna',
} as const;

export type SeedDoctorKey = 'adminDoctor' | 'doctor1' | 'doctor2' | 'doctor3';

export interface SeedDoctorPlan {
  key: SeedDoctorKey;
  email: string;
  name: string;
  role: Role;
  specialization: Specialization;
  hospitalRole: HospitalRole;
  qualification: string;
  registrationNumber: string;
  licenseNumber: string;
  phoneNumber: string;
  bio: string;
  yearsOfExperience: number;
  consultationFee: number;
  signatureUrl: string | null;
}

export const SEED_DOCTOR_PLANS: SeedDoctorPlan[] = [
  {
    key: 'adminDoctor',
    email: 'admin.doctor@docita.work',
    name: 'Admin Doctor',
    role: 'ADMIN_DOCTOR',
    specialization: 'GENERAL_PRACTICE',
    hospitalRole: 'MEDICAL_DIRECTOR',
    qualification: 'MBBS, MD (General Medicine)',
    registrationNumber: 'KMC-2010-99887',
    licenseNumber: 'KA-MED-2010-009988',
    phoneNumber: '+91 9876543009',
    bio: 'Medical Director with extensive experience in hospital administration and general practice.',
    yearsOfExperience: 15,
    consultationFee: 2000,
    signatureUrl:
      'https://placehold.co/300x100/000000/FFFFFF?text=Dr+Admin+Doctor',
  },
  {
    key: 'doctor1',
    email: 'doctor@docita.work',
    name: 'Vamsi Krishna',
    role: 'DOCTOR',
    specialization: 'CARDIOLOGY',
    hospitalRole: 'SENIOR_CONSULTANT',
    qualification: 'MBBS, MD (Cardiology)',
    registrationNumber: 'KMC-2015-12345',
    licenseNumber: 'KA-MED-2015-001234',
    phoneNumber: '+91 9876543001',
    bio: 'Senior Cardiologist with over 10 years of experience in interventional cardiology. Specializes in complex cardiac procedures and heart failure management.',
    yearsOfExperience: 10,
    consultationFee: 1500,
    signatureUrl:
      'https://placehold.co/300x100/000000/FFFFFF?text=Dr+Vamsi+Krishna',
  },
  {
    key: 'doctor2',
    email: 'dr.sharma@docita.work',
    name: 'Priya Sharma',
    role: 'DOCTOR',
    specialization: 'PEDIATRICS',
    hospitalRole: 'CONSULTANT',
    qualification: 'MBBS, DCH, MD (Pediatrics)',
    registrationNumber: 'KMC-2018-54341',
    licenseNumber: 'KA-MED-2018-005678',
    phoneNumber: '+91 9876543002',
    bio: 'Pediatrician specializing in newborn care, childhood vaccinations, and developmental pediatrics. Committed to providing compassionate care for children.',
    yearsOfExperience: 6,
    consultationFee: 1000,
    signatureUrl: null,
  },
  {
    key: 'doctor3',
    email: 'dr.dental@docita.work',
    name: 'Arun Menon',
    role: 'DOCTOR',
    specialization: 'DENTAL',
    hospitalRole: 'CONSULTANT',
    qualification: 'BDS, MDS (Orthodontics)',
    registrationNumber: 'KDC-2016-67890',
    licenseNumber: 'KA-DEN-2016-002345',
    phoneNumber: '+91 9876543003',
    bio: 'Dental specialist with expertise in orthodontics, dental implants, and cosmetic dentistry. Uses latest technology for painless treatments.',
    yearsOfExperience: 8,
    consultationFee: 800,
    signatureUrl: null,
  },
];

export type SeedStaffKey =
  | 'nurse'
  | 'nurse2'
  | 'receptionist'
  | 'receptionist2';

export interface SeedStaffPlan {
  key: SeedStaffKey;
  email: string;
  name: string;
  role: Role;
  phoneNumber: string | null;
}

export const SEED_STAFF_PLANS: SeedStaffPlan[] = [
  {
    key: 'receptionist',
    email: 'reception@docita.work',
    name: 'Anjali Reddy',
    role: 'RECEPTIONIST',
    phoneNumber: null,
  },
  {
    key: 'nurse',
    email: 'nurse@docita.work',
    name: 'Nurse Kavya',
    role: 'NURSE',
    phoneNumber: '+91 9876543010',
  },
  {
    key: 'nurse2',
    email: 'nurse.priya@docita.work',
    name: 'Nurse Priya',
    role: 'NURSE',
    phoneNumber: '+91 9876543011',
  },
  {
    key: 'receptionist2',
    email: 'reception.front@docita.work',
    name: 'Front Desk Meera',
    role: 'RECEPTIONIST',
    phoneNumber: '+91 9876543012',
  },
];

export const SEED_DEFAULT_CLINIC_PLAN = {
  id: 'default-clinic-id',
  name: 'Docita General Hospital',
  address: '1 Hospital Avenue, Whitefield, Bangalore, Karnataka 560066',
  phone: '+91 80 4000 5000',
  email: 'contact@docita.work',
  active: true,
  tier: 'ENTERPRISE',
  planMode: 'FULL' as PlanMode,
} as const;
