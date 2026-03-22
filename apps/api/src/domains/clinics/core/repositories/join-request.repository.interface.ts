export interface JoinRequestCreateInput {
  userId: string;
  clinicId: string;
  requestedRole: string;
  message?: string;
  expiresAt: Date;
}

export interface JoinRequestApproveInput {
  requestId: string;
  userId: string;
  clinicId: string;
  approvedById: string;
  approvedByName: string;
  finalRole: string;
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

export interface IJoinRequestRepository {
  create(input: JoinRequestCreateInput): Promise<unknown>;
  findById(id: string): Promise<unknown | null>;
  findPending(userId: string, clinicId: string): Promise<unknown | null>;
  findUserPendingRequests(userId: string): Promise<unknown[]>;
  findByClinic(clinicId: string, status?: string): Promise<unknown[]>;
  approve(input: JoinRequestApproveInput): Promise<void>;
  reject(input: JoinRequestRejectInput): Promise<void>;
  withdraw(input: JoinRequestWithdrawInput): Promise<void>;
  expireOldRequests(): Promise<number>;
}

export const JOIN_REQUEST_REPOSITORY_TOKEN = Symbol('IJoinRequestRepository');
