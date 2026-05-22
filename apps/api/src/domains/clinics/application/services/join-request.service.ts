import { Injectable } from '@nestjs/common';
import type { MemberJoinRequest, JoinRequestStatus, Role } from '@workspace/db';
import { JoinRequestCommandService } from './join-request-command.service';
import { JoinRequestQueryService } from './join-request-query.service';

/**
 * Facade — delegates join-request reads and mutations to query/command services.
 */
@Injectable()
export class JoinRequestService {
  constructor(
    private readonly queryService: JoinRequestQueryService,
    private readonly commandService: JoinRequestCommandService,
  ) {}

  create(data: {
    userId: string;
    clinicId: string;
    requestedRole: Role;
    message?: string;
  }): Promise<MemberJoinRequest> {
    return this.commandService.create(data);
  }

  findById(id: string): Promise<MemberJoinRequest | null> {
    return this.queryService.findById(id);
  }

  findPending(
    userId: string,
    clinicId: string,
  ): Promise<MemberJoinRequest | null> {
    return this.queryService.findPending(userId, clinicId);
  }

  findUserPendingRequests(userId: string): Promise<MemberJoinRequest[]> {
    return this.queryService.findUserPendingRequests(userId);
  }

  findByClinic(
    clinicId: string,
    status?: JoinRequestStatus,
  ): Promise<MemberJoinRequest[]> {
    return this.queryService.findByClinic(clinicId, status);
  }

  approve(
    requestId: string,
    approvedById: string,
    approvedByName: string,
    assignedRole?: Role,
    welcomeMessage?: string,
  ): Promise<MemberJoinRequest> {
    return this.commandService.approve(
      requestId,
      approvedById,
      approvedByName,
      assignedRole,
      welcomeMessage,
    );
  }

  reject(
    requestId: string,
    approvedById: string,
    approvedByName: string,
    reason: string,
  ): Promise<MemberJoinRequest> {
    return this.commandService.reject(
      requestId,
      approvedById,
      approvedByName,
      reason,
    );
  }

  withdraw(requestId: string, userId: string): Promise<MemberJoinRequest> {
    return this.commandService.withdraw(requestId, userId);
  }

  expireOldRequests(): Promise<number> {
    return this.commandService.expireOldRequests();
  }
}
