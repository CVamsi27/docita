export type InternalUserRole =
  | "ADMIN"
  | "ADMIN_DOCTOR"
  | "DOCTOR"
  | "RECEPTIONIST";

export interface InternalClinicSummary {
  id: string;
  name: string;
  currency?: string;
}

export interface InternalPortalUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: InternalUserRole;
  specialization?: string;
  hospitalRole?: string;
  qualification?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  bio?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  createdAt: string;
  clinicId?: string;
}
