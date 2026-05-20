import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { MemberJoinRequest, Role } from '@workspace/db';
import { addDays } from '@workspace/utils';
import {
  IJoinRequestRepository,
  JOIN_REQUEST_REPOSITORY_TOKEN,
} from '@/domains/clinics/core/repositories/join-request.repository.interface';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { JoinRequestQueryService } from './join-request-query.service';

@Injectable()
export class JoinRequestCommandService {
  private readonly logger = new Logger(JoinRequestCommandService.name);

  constructor(
    @Inject(JOIN_REQUEST_REPOSITORY_TOKEN)
    private readonly repository: IJoinRequestRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly queryService: JoinRequestQueryService,
  ) {}

  async create(data: {
    userId: string;
    clinicId: string;
    requestedRole: Role;
    message?: string;
  }): Promise<MemberJoinRequest> {
    this.logger.log('Creating join request', {
      userId: data.userId,
      clinicId: data.clinicId,
    });

    const request = await this.repository.create({
      userId: data.userId,
      clinicId: data.clinicId,
      requestedRole: data.requestedRole,
      message: data.message,
      expiresAt: addDays(this.clock.now(), 7),
    });

    this.logger.log('Join request created', {
      requestId: request.id,
    });
    return request;
  }

  async approve(
    requestId: string,
    approvedById: string,
    approvedByName: string,
    assignedRole?: Role,
    welcomeMessage?: string,
  ): Promise<MemberJoinRequest> {
    const request = await this.queryService.findById(requestId);

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request already processed');
    }

    this.logger.log('Approving join request', { requestId });

    const finalRole = assignedRole ?? request.requestedRole;

    await this.repository.approve({
      requestId,
      userId: request.userId,
      clinicId: request.clinicId,
      approvedById,
      approvedByName,
      finalRole,
      welcomeMessage,
    });

    this.logger.log('Join request approved', { requestId });

    const updated = await this.queryService.findById(requestId);
    if (!updated)
      throw new NotFoundException('Join request not found after approval');
    return updated;
  }

  async reject(
    requestId: string,
    approvedById: string,
    approvedByName: string,
    reason: string,
  ): Promise<MemberJoinRequest> {
    const request = await this.queryService.findById(requestId);

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request already processed');
    }

    this.logger.log('Rejecting join request', { requestId });

    await this.repository.reject({
      requestId,
      userId: request.userId,
      approvedById,
      approvedByName,
      reason,
    });

    this.logger.log('Join request rejected', { requestId });

    const updated = await this.queryService.findById(requestId);
    if (!updated)
      throw new NotFoundException('Join request not found after rejection');
    return updated;
  }

  async withdraw(
    requestId: string,
    userId: string,
  ): Promise<MemberJoinRequest> {
    const request = await this.queryService.findById(requestId);

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    if (request.userId !== userId) {
      throw new BadRequestException('Not authorized to withdraw this request');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Can only withdraw pending requests');
    }

    this.logger.log('Withdrawing join request', { requestId });

    await this.repository.withdraw({ requestId, userId });

    this.logger.log('Join request withdrawn', { requestId });

    const updated = await this.queryService.findById(requestId);
    if (!updated)
      throw new NotFoundException('Join request not found after withdrawal');
    return updated;
  }

  async expireOldRequests(): Promise<number> {
    const count = await this.repository.expireOldRequests();
    this.logger.log('Expired old join requests', { count });
    return count;
  }
}
