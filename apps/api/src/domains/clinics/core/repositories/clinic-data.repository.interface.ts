export interface CreateClinicInput {
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  tier?: string;
  type?: string;
  referralCode: string;
  subscriptionStatus?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateClinicInput {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  tier?: string;
  type?: string;
  settings?: Record<string, unknown>;
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
  role: string;
  clinicId: string | null;
}

export interface IClinicDataRepository {
  findByReferralCode(code: string): Promise<{ id: string } | null>;
  create(data: CreateClinicInput): Promise<unknown>;
  findAll(): Promise<unknown[]>;
  findById(id: string): Promise<unknown | null>;
  update(id: string, data: UpdateClinicInput): Promise<unknown>;
  softDelete(id: string): Promise<unknown>;
  findDoctorClinics(doctorId: string): Promise<unknown[]>;
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
