import {
  Clinic,
  ClinicTier,
  ClinicType,
  Prisma,
  Role,
  SubscriptionStatus,
} from '@workspace/db';

export interface CreateClinicInput {
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  tier?: ClinicTier;
  type?: ClinicType;
  referralCode: string;
  subscriptionStatus?: SubscriptionStatus;
  settings?: Prisma.InputJsonValue;
}

export interface UpdateClinicInput {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  tier?: ClinicTier;
  type?: ClinicType;
  settings?: Prisma.InputJsonValue;
}

export interface ClinicStats {
  totalPatients: number;
  totalAppointments: number;
  todayAppointments: number;
}

export interface ClinicLookup {
  id: string;
  name: string;
  email: string;
  referralCode: string | null;
}

export interface ClinicSearchResult {
  id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  referralCode: string | null;
}

export interface UserForClinicJoin {
  id: string;
  role: Role;
  clinicId: string | null;
}

export type ClinicListItem = Prisma.ClinicGetPayload<{
  include: {
    _count: {
      select: {
        users: true;
        patients: true;
        appointments: true;
      };
    };
  };
}>;

export type ClinicDetailsItem = Prisma.ClinicGetPayload<{
  include: {
    subscription: {
      select: {
        graceUntil: true;
      };
    };
    users: {
      select: {
        id: true;
        name: true;
        email: true;
        role: true;
      };
    };
    _count: {
      select: {
        patients: true;
        appointments: true;
      };
    };
  };
}>;

export type DoctorClinicItem = Prisma.DoctorClinicGetPayload<{
  select: {
    clinic: {
      select: {
        id: true;
        name: true;
        address: true;
        phone: true;
        email: true;
        website: true;
        tier: true;
        logo: true;
        active: true;
        settings: true;
        createdAt: true;
        updatedAt: true;
      };
    };
  };
}>;

export interface IClinicDataRepository {
  findByReferralCode(code: string): Promise<{ id: string } | null>;
  create(data: CreateClinicInput): Promise<Clinic>;
  findAll(): Promise<ClinicListItem[]>;
  findById(id: string): Promise<ClinicDetailsItem | null>;
  update(id: string, data: UpdateClinicInput): Promise<Clinic>;
  softDelete(id: string): Promise<Clinic>;
  findDoctorClinics(doctorId: string): Promise<DoctorClinicItem[]>;
  getStats(clinicId: string): Promise<ClinicStats>;
  findUserForJoin(userId: string): Promise<UserForClinicJoin | null>;
  findClinicByCodeOrEmail(
    code?: string,
    email?: string,
  ): Promise<ClinicLookup | null>;
  joinClinic(userId: string, clinicId: string, userRole: string): Promise<void>;
  searchActive(query: string): Promise<ClinicSearchResult[]>;
}

export const CLINIC_DATA_REPOSITORY_TOKEN = Symbol('IClinicDataRepository');
