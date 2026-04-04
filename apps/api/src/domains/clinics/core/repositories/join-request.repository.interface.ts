import {
  JoinRequestStatus,
  MemberJoinRequest,
  Prisma,
  Role,
} from '@workspace/db';

export interface JoinRequestCreateInput {
  userId: string;
  clinicId: string;
  requestedRole: Role;
  message?: string;
  expiresAt: Date;
}

export interface JoinRequestApproveInput {
  requestId: string;
  userId: string;
  clinicId: string;
  approvedById: string;
  approvedByName: string;
  finalRole: Role;
  welcomeMessage?: string;
}

export interface JoinRequestRejectInput {
  requestId: string;
  userId: string;
  approvedById: string;
  approvedByName: string;
  reason: string;
}

export interface JoinRequestWithdrawInput {
  requestId: string;
  userId: string;
}

export type MemberJoinRequestWithRelations =
  Prisma.MemberJoinRequestGetPayload<{
    include: {
      user: {
        select: {
          id: true;
          name: true;
          email: true;
        };
      };
      clinic: {
        select: {
          id: true;
          name: true;
        };
      };
    };
  }>;

export type PendingJoinRequestWithClinic = Prisma.MemberJoinRequestGetPayload<{
  include: {
    clinic: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

export type ClinicJoinRequestItem = Prisma.MemberJoinRequestGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        phoneNumber: true;
      };
    };
  };
}>;

export interface IJoinRequestRepository {
  create(
    input: JoinRequestCreateInput,
  ): Promise<MemberJoinRequestWithRelations>;
  findById(id: string): Promise<MemberJoinRequestWithRelations | null>;
  findPending(
    userId: string,
    clinicId: string,
  ): Promise<MemberJoinRequest | null>;
  findUserPendingRequests(
    userId: string,
  ): Promise<PendingJoinRequestWithClinic[]>;
  findByClinic(
    clinicId: string,
    status?: JoinRequestStatus,
  ): Promise<ClinicJoinRequestItem[]>;
  approve(input: JoinRequestApproveInput): Promise<void>;
  reject(input: JoinRequestRejectInput): Promise<void>;
  withdraw(input: JoinRequestWithdrawInput): Promise<void>;
  expireOldRequests(): Promise<number>;
}

export const JOIN_REQUEST_REPOSITORY_TOKEN = Symbol('IJoinRequestRepository');
