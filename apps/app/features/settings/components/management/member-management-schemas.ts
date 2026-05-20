import type {
  InviteFormValues,
  MemberFormValues,
  MemberRole,
} from "@workspace/types";

export {
  inviteTeamMemberFormSchema as inviteSchema,
  memberManagementFormSchema as memberSchema,
  type InviteFormValues,
  type MemberFormValues,
  type MemberRole,
} from "@workspace/types";

export const DOCTOR_ROLES = new Set<MemberRole>(["DOCTOR", "ADMIN_DOCTOR"]);
export const ADMIN_SWITCH_ROLES = new Set<MemberRole>(["ADMIN", "ADMIN_DOCTOR"]);

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  RECEPTIONIST: "Receptionist",
  ADMIN: "Admin",
  ADMIN_DOCTOR: "Admin Doctor",
};

export const INVITE_SUCCESS_LABELS: Record<InviteFormValues["role"], string> = {
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  RECEPTIONIST: "Receptionist",
  ADMIN: "Admin",
  ADMIN_DOCTOR: "Admin Doctor",
};
