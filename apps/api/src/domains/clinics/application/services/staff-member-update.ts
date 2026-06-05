import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, Specialization } from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';
import type {
  ClinicMemberRole,
  UpdateMemberData,
} from './staff-management-helpers';
import { actorMayAssignMemberRoles } from './staff-management-helpers';

type ExistingMember = { id: string; role: Role } | null;
type MemberUpdatePersistenceData = {
  name?: string;
  email?: string;
  phoneNumber?: string;
  role?: ClinicMemberRole;
  appLoginDisabled?: boolean;
  specialization?: Specialization;
  qualification?: string;
  registrationNumber?: string;
  labId?: string | null;
};

const CLINIC_MEMBER_ROLES = new Set<ClinicMemberRole>([
  Role.DOCTOR,
  Role.NURSE,
  Role.RECEPTIONIST,
  Role.ADMIN,
  Role.ADMIN_DOCTOR,
  Role.LAB,
]);

export function assertCanUpdateMember(params: {
  member: ExistingMember;
  memberId: string;
  data: UpdateMemberData;
  actorUserId: string;
  actorRole: Role;
  isFrontDesk: boolean;
}): asserts params is {
  member: NonNullable<ExistingMember>;
  memberId: string;
  data: UpdateMemberData;
  actorUserId: string;
  actorRole: Role;
  isFrontDesk: boolean;
} {
  assertMemberExists(params.member);
  assertSelfRoleChangeAllowed(params);
  assertClinicMemberRole(params.data.role);
  assertActorMayChangeRole(params);
  assertFrontDeskRoleAllowed(params.data.role, params.isFrontDesk);
}

export function resolveAppLoginDisabled(
  role: ClinicMemberRole | undefined,
  isFrontDesk: boolean,
): boolean | undefined {
  if (role === undefined) return undefined;
  if (role === Role.DOCTOR && isFrontDesk) return true;
  return role !== Role.DOCTOR ? false : undefined;
}

export function buildMemberUpdateData(
  data: UpdateMemberData,
  appLoginDisabled: boolean | undefined,
): MemberUpdatePersistenceData {
  const updateData: MemberUpdatePersistenceData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
  if (data.role !== undefined) updateData.role = data.role;
  if (appLoginDisabled !== undefined)
    updateData.appLoginDisabled = appLoginDisabled;
  const specialization = parseSpecialization(data.specialization);
  if (specialization !== undefined) updateData.specialization = specialization;
  if (data.qualification !== undefined)
    updateData.qualification = data.qualification;
  if (data.registrationNumber !== undefined) {
    updateData.registrationNumber = data.registrationNumber;
  }
  // Lab assignment only applies to LAB members; clearing it for others keeps
  // the column consistent when a member is re-roled away from the lab.
  if (data.labId !== undefined) {
    updateData.labId = data.role === Role.LAB ? data.labId : null;
  } else if (data.role !== undefined && data.role !== Role.LAB) {
    updateData.labId = null;
  }
  return updateData;
}

function assertMemberExists(
  member: ExistingMember,
): asserts member is NonNullable<ExistingMember> {
  if (!member) throw new NotFoundException('Member not found in this clinic');
}

function assertSelfRoleChangeAllowed(params: {
  member: ExistingMember;
  memberId: string;
  data: UpdateMemberData;
  actorUserId: string;
}): void {
  if (
    params.actorUserId === params.memberId &&
    params.member &&
    params.data.role &&
    params.data.role !== params.member.role
  ) {
    throw new BadRequestException('You cannot change your own role');
  }
}

function assertClinicMemberRole(role: ClinicMemberRole | undefined): void {
  if (role && !CLINIC_MEMBER_ROLES.has(role)) {
    throw new BadRequestException('Invalid role for clinic member update');
  }
}

function assertActorMayChangeRole(params: {
  member: ExistingMember;
  data: UpdateMemberData;
  actorRole: Role;
}): void {
  if (
    params.member &&
    params.data.role &&
    params.data.role !== params.member.role &&
    !actorMayAssignMemberRoles(params.actorRole)
  ) {
    throw new ForbiddenException('Only admins can change member roles');
  }
}

function assertFrontDeskRoleAllowed(
  role: ClinicMemberRole | undefined,
  isFrontDesk: boolean,
): void {
  if (!role || !isFrontDesk) return;
  if (role === Role.NURSE || role === Role.ADMIN_DOCTOR) {
    throw new BadRequestException(
      'This role is not available for the front desk workspace.',
    );
  }
}

function parseSpecialization(value: string | undefined) {
  return value === undefined
    ? undefined
    : (parseStringEnumMember(Object.values(Specialization), value) ??
        undefined);
}
