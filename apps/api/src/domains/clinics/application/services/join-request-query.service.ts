import { Injectable, Inject } from '@nestjs/common';
import type { MemberJoinRequest, JoinRequestStatus } from '@workspace/db';
import {
  IJoinRequestRepository,
  JOIN_REQUEST_REPOSITORY_TOKEN,
} from '@/domains/clinics/core/repositories/join-request.repository.interface';

@Injectable()
export class JoinRequestQueryService {
  constructor(
    @Inject(JOIN_REQUEST_REPOSITORY_TOKEN)
    private readonly repository: IJoinRequestRepository,
  ) {}

  async findById(id: string): Promise<MemberJoinRequest | null> {
    return await this.repository.findById(id);
  }

  async findPending(
    userId: string,
    clinicId: string,
  ): Promise<MemberJoinRequest | null> {
    return await this.repository.findPending(userId, clinicId);
  }

  async findUserPendingRequests(userId: string): Promise<MemberJoinRequest[]> {
    return await this.repository.findUserPendingRequests(userId);
  }

  async findByClinic(
    clinicId: string,
    status?: JoinRequestStatus,
  ): Promise<MemberJoinRequest[]> {
    return await this.repository.findByClinic(clinicId, status);
  }
}
