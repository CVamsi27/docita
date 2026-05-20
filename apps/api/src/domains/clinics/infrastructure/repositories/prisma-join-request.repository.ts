import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { JoinRequestStatus, Role } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IJoinRequestRepository,
  JoinRequestCreateInput,
  JoinRequestApproveInput,
  JoinRequestRejectInput,
  JoinRequestWithdrawInput,
} from '@/domains/clinics/core/repositories/join-request.repository.interface';

const JOIN_REQUEST_WITH_RELATIONS = {
  user: { select: { id: true, name: true, email: true } },
  clinic: { select: { id: true, name: true } },
};

@Injectable()
export class PrismaJoinRequestRepository implements IJoinRequestRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async create(input: JoinRequestCreateInput) {
    const [request] = await this.prisma.$transaction([
      this.prisma.memberJoinRequest.create({
        data: {
          userId: input.userId,
          clinicId: input.clinicId,
          requestedRole: input.requestedRole,
          message: input.message,
          expiresAt: input.expiresAt,
        },
        include: JOIN_REQUEST_WITH_RELATIONS,
      }),
      this.prisma.user.update({
        where: { id: input.userId },
        data: { onboardingStep: 'JOINING_CLINIC' },
      }),
    ]);
    return request;
  }

  async findById(id: string) {
    return this.getReadClient().memberJoinRequest.findUnique({
      where: { id },
      include: JOIN_REQUEST_WITH_RELATIONS,
    });
  }

  async findPending(userId: string, clinicId: string) {
    return this.getReadClient().memberJoinRequest.findFirst({
      where: { userId, clinicId, status: 'PENDING' },
    });
  }

  async findUserPendingRequests(userId: string) {
    return this.getReadClient().memberJoinRequest.findMany({
      where: { userId, status: 'PENDING' },
      include: { clinic: { select: { id: true, name: true } } },
    });
  }

  async findByClinic(clinicId: string, status?: JoinRequestStatus) {
    return this.getReadClient().memberJoinRequest.findMany({
      where: {
        clinicId,
        ...(status ? { status } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async approve(input: JoinRequestApproveInput): Promise<void> {
    const now = this.clock.now();
    await this.prisma.$transaction(async (tx) => {
      await tx.memberJoinRequest.update({
        where: { id: input.requestId },
        data: {
          status: 'APPROVED',
          approvedById: input.approvedById,
          approvedByName: input.approvedByName,
          responseMessage: input.welcomeMessage,
          respondedAt: now,
        },
      });

      await tx.user.update({
        where: { id: input.userId },
        data: {
          clinicId: input.clinicId,
          role: input.finalRole,
          onboardingStep: 'COMPLETED',
          onboardingCompletedAt: now,
        },
      });

      if (
        input.finalRole === Role.DOCTOR ||
        input.finalRole === Role.ADMIN_DOCTOR
      ) {
        await tx.doctorClinic.upsert({
          where: {
            doctorId_clinicId: {
              doctorId: input.userId,
              clinicId: input.clinicId,
            },
          },
          create: {
            doctorId: input.userId,
            clinicId: input.clinicId,
            role:
              input.finalRole === Role.ADMIN_DOCTOR ? 'admin_doctor' : 'doctor',
            active: true,
          },
          update: {
            active: true,
            role:
              input.finalRole === Role.ADMIN_DOCTOR ? 'admin_doctor' : 'doctor',
          },
        });
      }
    });
  }

  async reject(input: JoinRequestRejectInput): Promise<void> {
    const now = this.clock.now();
    await this.prisma.$transaction(async (tx) => {
      await tx.memberJoinRequest.update({
        where: { id: input.requestId },
        data: {
          status: 'REJECTED',
          approvedById: input.approvedById,
          approvedByName: input.approvedByName,
          responseMessage: input.reason,
          respondedAt: now,
        },
      });

      await tx.user.update({
        where: { id: input.userId },
        data: { onboardingStep: 'CHOOSE_PATH' },
      });
    });
  }

  async withdraw(input: JoinRequestWithdrawInput): Promise<void> {
    const now = this.clock.now();
    await this.prisma.$transaction(async (tx) => {
      await tx.memberJoinRequest.update({
        where: { id: input.requestId },
        data: { status: 'WITHDRAWN', respondedAt: now },
      });

      await tx.user.update({
        where: { id: input.userId },
        data: { onboardingStep: 'CHOOSE_PATH' },
      });
    });
  }

  async expireOldRequests(): Promise<number> {
    const now = this.clock.now();
    return this.prisma.$transaction(async (tx) => {
      const expiredRequests = await tx.memberJoinRequest.findMany({
        where: { status: 'PENDING', expiresAt: { lt: now } },
        select: { id: true, userId: true },
      });

      if (expiredRequests.length === 0) return 0;

      await tx.memberJoinRequest.updateMany({
        where: { id: { in: expiredRequests.map((r) => r.id) } },
        data: { status: 'EXPIRED', respondedAt: now },
      });

      await tx.user.updateMany({
        where: {
          id: { in: expiredRequests.map((r) => r.userId) },
          onboardingStep: 'JOINING_CLINIC',
        },
        data: { onboardingStep: 'CHOOSE_PATH' },
      });

      return expiredRequests.length;
    });
  }
}
