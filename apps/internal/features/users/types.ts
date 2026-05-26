import { Shield, Stethoscope, UserCog, Users } from "lucide-react";
import type {
  InternalPortalUser,
  InternalUserRole,
} from "@workspace/data-access/internal";

export type UserRole = InternalUserRole;

export type User = InternalPortalUser;

export type RoleFilter = UserRole | "ALL";

export const ROLE_CONFIG = {
  ALL: { label: "All Users", icon: Users },
  ADMIN: { label: "Clinic Admins", icon: Shield },
  ADMIN_DOCTOR: { label: "Admin Doctors", icon: UserCog },
  DOCTOR: { label: "Doctors", icon: Stethoscope },
  RECEPTIONIST: { label: "Receptionists", icon: Users },
} as const;
