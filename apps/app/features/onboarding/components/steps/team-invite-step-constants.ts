import { parseStringEnumMember } from "@workspace/utils";
import type { TeamMember } from "@/features/onboarding/components/types";

const TEAM_MEMBER_ROLE_VALUES = [
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "ADMIN",
  "ADMIN_DOCTOR",
] as const;

export function parseTeamMemberRole(value: string): TeamMember["role"] {
  return parseStringEnumMember(TEAM_MEMBER_ROLE_VALUES, value) ?? "DOCTOR";
}

export interface TeamInviteStepProps {
  onComplete: (members: TeamMember[]) => void;
  onSkip: () => void;
  maxMembers?: number;
  ownerName?: string;
  ownerEmail?: string;
  ownerRole?: "ADMIN" | "ADMIN_DOCTOR";
}

export const ROLE_OPTIONS = [
  {
    value: "DOCTOR",
    label: "Doctor",
    description: "Can manage consultations, notes, and clinical workflows",
  },
  {
    value: "NURSE",
    label: "Nurse",
    description: "Can support patient care, review charts, and record vitals",
  },
  {
    value: "RECEPTIONIST",
    label: "Receptionist",
    description: "Can handle appointments, front desk, and patient check-in",
  },
  {
    value: "ADMIN",
    label: "Admin",
    description: "Can manage clinic operations, members, and billing settings",
  },
  {
    value: "ADMIN_DOCTOR",
    label: "Admin Doctor",
    description:
      "Doctor with admin access who can help manage members and permissions",
  },
];

export const createEmptyMember = (): TeamMember => ({
  email: "",
  role: "DOCTOR",
  name: "",
  password: "",
  phoneNumber: "",
  specialization: "",
  qualification: "",
  registrationNumber: "",
});

export const isDoctorRole = (role: TeamMember["role"]) =>
  role === "DOCTOR" || role === "ADMIN_DOCTOR";
