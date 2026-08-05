import type { InviteFormValues, MemberRole } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";

export {
  inviteTeamMemberFormSchema,
  memberManagementFormSchema,
  type InviteFormValues,
  type MemberFormValues,
  type MemberRole,
} from "@workspace/types";

export const DOCTOR_ROLES = new Set<MemberRole>(["DOCTOR", "ADMIN_DOCTOR"]);
export const ADMIN_SWITCH_ROLES = new Set<MemberRole>([
  "ADMIN",
  "ADMIN_DOCTOR",
]);

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  RECEPTIONIST: "Receptionist",
  ADMIN: "Admin",
  ADMIN_DOCTOR: "Admin Doctor",
  LAB: "Lab Technician",
};

export const MEMBER_ROLE_VALUES = [
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "ADMIN",
  "ADMIN_DOCTOR",
  "LAB",
] as const satisfies readonly MemberRole[];

export function memberRoleDisplayLabel(role: string | null | undefined): string {
  const parsed = role
    ? parseStringEnumMember(MEMBER_ROLE_VALUES, role)
    : null;
  return parsed ? MEMBER_ROLE_LABELS[parsed] : role || "Staff";
}

export const INVITE_SUCCESS_LABELS: Record<InviteFormValues["role"], string> = {
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  RECEPTIONIST: "Receptionist",
  ADMIN: "Admin",
  ADMIN_DOCTOR: "Admin Doctor",
  LAB: "Lab Technician",
};
