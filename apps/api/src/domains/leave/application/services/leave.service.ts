import { Injectable } from '@nestjs/common';
import { LeaveCommandService } from './leave-command.service';
import { LeaveQueryService } from './leave-query.service';

/**
 * Facade — delegates leave mutations and reads to command/query services.
 */
@Injectable()
export class LeaveService {
  constructor(
    private readonly commandService: LeaveCommandService,
    private readonly queryService: LeaveQueryService,
  ) {}

  applyLeave(
    staffId: string,
    clinicId: string,
    data: Parameters<LeaveCommandService['applyLeave']>[2],
  ) {
    return this.commandService.applyLeave(staffId, clinicId, data);
  }

  approveLeave(leaveId: string, approverId: string, clinicId: string) {
    return this.commandService.approveLeave(leaveId, approverId, clinicId);
  }

  rejectLeave(
    leaveId: string,
    approverId: string,
    clinicId: string,
    rejectionReason: string,
  ) {
    return this.commandService.rejectLeave(
      leaveId,
      approverId,
      clinicId,
      rejectionReason,
    );
  }

  cancelLeave(leaveId: string, staffId: string, clinicId: string) {
    return this.commandService.cancelLeave(leaveId, staffId, clinicId);
  }

  getLeaves(
    clinicId: string,
    filters: Parameters<LeaveQueryService['getLeaves']>[1],
  ) {
    return this.queryService.getLeaves(clinicId, filters);
  }

  getLeaveBalance(staffId: string, clinicId: string) {
    return this.queryService.getLeaveBalance(staffId, clinicId);
  }
}
