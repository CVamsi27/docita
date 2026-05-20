import { BadRequestException } from '@nestjs/common';
import { LeaveStatus, LeaveType } from '@workspace/db';

export function parseLeaveType(rawType: string): LeaveType {
  if ((Object.values(LeaveType) as string[]).includes(rawType)) {
    return rawType as LeaveType;
  }
  throw new BadRequestException(`Unsupported leave type: ${rawType}`);
}

export function parseLeaveStatus(rawStatus: string): LeaveStatus {
  if ((Object.values(LeaveStatus) as string[]).includes(rawStatus)) {
    return rawStatus as LeaveStatus;
  }
  throw new BadRequestException(`Unsupported leave status: ${rawStatus}`);
}
