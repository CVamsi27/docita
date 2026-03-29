import { Shield, Stethoscope, UserCog, Users } from "lucide-react";

export type UserRole = "ADMIN" | "ADMIN_DOCTOR" | "DOCTOR" | "RECEPTIONIST";

export interface Clinic {
  id: string;
  name: string;
  currency?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
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

export type RoleFilter = UserRole | "ALL";

export const ROLE_CONFIG = {
  ALL: { label: "All Users", icon: Users },
  ADMIN: { label: "Clinic Admins", icon: Shield },
  ADMIN_DOCTOR: { label: "Admin Doctors", icon: UserCog },
  DOCTOR: { label: "Doctors", icon: Stethoscope },
  RECEPTIONIST: { label: "Receptionists", icon: Users },
} as const;
