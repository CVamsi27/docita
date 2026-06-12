import {
  ClinicTier,
  ClinicType,
  Prisma,
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
  abdmEnabled?: boolean;
  hfrFacilityId?: string | null;
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
