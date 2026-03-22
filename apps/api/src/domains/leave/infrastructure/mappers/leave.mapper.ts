import {
  StaffLeave as PrismaStaffLeave,
  LeavePlan as PrismaLeavePlan,
  User as PrismaUser,
} from '@workspace/db';
import { StaffLeave, LeavePlan } from '@workspace/types';

export class LeaveMapper {
  static staffLeaveToDomain(
    raw: PrismaStaffLeave & {
      staff?: Pick<PrismaUser, 'id' | 'name' | 'email'> | null;
      approver?: Pick<PrismaUser, 'id' | 'name'> | null;
    },
  ): StaffLeave {
    return {
      id: raw.id,
      staffId: raw.staffId,
      clinicId: raw.clinicId,
      leaveType: raw.leaveType as StaffLeave['leaveType'],
      startDate: raw.startDate.toISOString(),
      endDate: raw.endDate.toISOString(),
      reason: raw.reason ?? undefined,
      status: raw.status as StaffLeave['status'],
      approvedBy: raw.approvedBy ?? undefined,
      approvedAt: raw.approvedAt?.toISOString() ?? undefined,
      rejectionReason: raw.rejectionReason ?? undefined,
      cancelledAt: raw.cancelledAt?.toISOString() ?? undefined,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      staff: raw.staff
        ? {
            id: raw.staff.id,
            name: raw.staff.name,
            email: raw.staff.email,
          }
        : undefined,
      approver: raw.approver
        ? { id: raw.approver.id, name: raw.approver.name }
        : null,
    };
  }

  static leavePlanToDomain(raw: PrismaLeavePlan): LeavePlan {
    return {
      id: raw.id,
      clinicId: raw.clinicId,
      leaveType: raw.leaveType as LeavePlan['leaveType'],
      annualQuota: raw.annualQuota,
      carryForward: raw.carryForward,
      maxCarryForward: raw.maxCarryForward,
      isActive: raw.isActive,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }
}
