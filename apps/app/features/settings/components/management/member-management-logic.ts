// check-as-cast-density: allow-file
import { User } from "@workspace/types";
import { isAdmin } from "@/lib/auth/permissions";
import { parseStringEnumMember } from "@workspace/utils";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  ADMIN_SWITCH_ROLES,
  DOCTOR_ROLES,
  type InviteFormValues,
  type MemberFormValues,
  type MemberRole,
} from "@/features/settings/components/management/member-management-schemas";

export function sortMembersByName(members: User[]): User[] {
  return [...members].sort((a, b) => a.name.localeCompare(b.name));
}

export function computeUserCanChangeRoles(role: string | undefined): boolean {
  return isAdmin(role);
}

export function computeIsSelectedMemberDoctor(role: string): boolean {
  return DOCTOR_ROLES.has(role as MemberRole);
}

export function computeCanChangeSelectedMemberRole(params: {
  selectedMember: User | null;
  userCanChangeRoles: boolean;
  currentUserId: string | undefined;
}): boolean {
  const { selectedMember, userCanChangeRoles, currentUserId } = params;
  return (
    !!selectedMember &&
    userCanChangeRoles &&
    selectedMember.id !== currentUserId &&
    parseStringEnumMember(
      Array.from(ADMIN_SWITCH_ROLES),
      selectedMember.role,
    ) !== undefined
  );
}

export function computeMemberDialogDescription(
  isSelectedMemberDoctor: boolean,
): string {
  return isSelectedMemberDoctor
    ? "Edit contact details, role eligibility, verification, and signature status."
    : "Edit contact details and review this member's role.";
}

export function getInviteFormDefaultValues(): InviteFormValues {
  return {
    name: "",
    email: "",
    password: "",
    role: "NURSE",
    phoneNumber: "",
    specialization: "",
    qualification: "",
    registrationNumber: "",
    labId: undefined,
  };
}

export function getEmptyMemberFormDefaultValues(): MemberFormValues {
  return {
    name: "",
    email: "",
    phoneNumber: "",
    role: "NURSE",
    specialization: "",
    qualification: "",
    registrationNumber: "",
    labId: undefined,
  };
}

export function getMemberFormDefaultValues(member: User): MemberFormValues {
  return {
    name: member.name ?? "",
    email: member.email ?? "",
    phoneNumber: member.phoneNumber ?? "",
    role: (member.role as MemberRole) ?? "NURSE",
    specialization: member.specialization ?? "",
    qualification: member.qualification ?? "",
    registrationNumber: member.registrationNumber ?? "",
    labId: member.labId ?? undefined,
  };
}

export function buildUpdateMemberPayload(
  memberId: string,
  data: MemberFormValues,
  canChangeRole: boolean,
  isDoctor: boolean,
) {
  return {
    memberId,
    name: data.name,
    email: data.email,
    phoneNumber: data.phoneNumber || undefined,
    ...(canChangeRole ? { role: data.role } : {}),
    ...(data.role === "LAB" ? { labId: data.labId || undefined } : {}),
    ...(isDoctor
      ? {
          specialization: data.specialization || undefined,
          qualification: data.qualification || undefined,
          registrationNumber: data.registrationNumber || undefined,
        }
      : {}),
  };
}

export function buildCreateMemberPayload(data: InviteFormValues) {
  return {
    name: data.name,
    email: data.email,
    password: data.password,
    role: data.role,
    phoneNumber: data.phoneNumber || undefined,
    specialization: data.specialization || undefined,
    qualification: data.qualification || undefined,
    registrationNumber: data.registrationNumber || undefined,
    ...(data.role === "LAB" ? { labId: data.labId || undefined } : {}),
  };
}

export function createToastCallbacks(
  successMsg: string,
  errorMsg: string,
  errorAction: Parameters<typeof showUserFacingErrorToast>[2],
  onSuccess?: () => void,
) {
  return {
    onSuccess: () => {
      toast.success(successMsg);
      onSuccess?.();
    },
    onError: (err: unknown) =>
      showUserFacingErrorToast(err, errorMsg, errorAction),
  };
}

export function getInviteGuardError(
  clinicId: string | undefined,
  role: string,
  userCanChangeRoles: boolean,
): string | null {
  if (!clinicId) return "We could not identify this facility. Please refresh and try again.";
  if (isAdmin(role) && !userCanChangeRoles) return "Only facility administrators can invite Admin or Admin Doctor accounts.";
  return null;
}
