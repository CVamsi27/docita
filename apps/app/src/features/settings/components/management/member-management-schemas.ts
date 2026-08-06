import type { MemberRole } from "@workspace/types";

export {
  inviteTeamMemberFormSchema,
  memberManagementFormSchema,
  type InviteFormValues,
  type MemberFormValues,
  type MemberRole,
} from "@workspace/types";

export { memberRoleLabel } from "./member-role-label";

export const DOCTOR_ROLES = new Set<MemberRole>(["DOCTOR", "ADMIN_DOCTOR"]);
export const ADMIN_SWITCH_ROLES = new Set<MemberRole>([
  "ADMIN",
  "ADMIN_DOCTOR",
]);

export const MEMBER_ROLE_VALUES = [
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "ADMIN",
  "ADMIN_DOCTOR",
  "LAB",
] as const satisfies readonly MemberRole[];
