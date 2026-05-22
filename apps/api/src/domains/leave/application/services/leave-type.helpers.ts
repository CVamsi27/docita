import { BadRequestException } from '@nestjs/common';
import { LeaveStatus, LeaveType } from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';

const LEAVE_TYPE_MEMBERS = Object.values(LeaveType);
const LEAVE_STATUS_MEMBERS = Object.values(LeaveStatus);

export function parseLeaveType(rawType: string): LeaveType {
  const parsed = parseStringEnumMember(LEAVE_TYPE_MEMBERS, rawType);
  if (!parsed) {
    throw new BadRequestException(`Unsupported leave type: ${rawType}`);
  }
  return parsed;
}

export function parseLeaveStatus(rawStatus: string): LeaveStatus {
  const parsed = parseStringEnumMember(LEAVE_STATUS_MEMBERS, rawStatus);
  if (!parsed) {
    throw new BadRequestException(`Unsupported leave status: ${rawStatus}`);
  }
  return parsed;
}
