import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { User } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import type { OtpRecord } from '@/domains/patient-portal/core/repositories/portal-patient.types';
import { IPortalAuthRepository } from '@/domains/patient-portal/core/repositories/portal-auth.repository.interface';

@Injectable()
export class PrismaPortalAuthRepository implements IPortalAuthRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async invalidateOtps(phone: string): Promise<void> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    await this.prisma.runUnrestricted(async () =>
      this.prisma.patientOtp.updateMany({
        where: { phoneNumber: phone, usedAt: null },
        data: { usedAt: this.clock.now() },
      }),
    );
  }

  async createOtp(data: {
    phoneNumber: string;
    otpHash: string;
    expiresAt: Date;
  }): Promise<OtpRecord> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.prisma.runUnrestricted(async () =>
      this.prisma.patientOtp.create({ data }),
    );
  }

  async findActiveOtp(phone: string, now: Date): Promise<OtpRecord | null> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.prisma.runUnrestricted(async () =>
      this.prisma.patientOtp.findFirst({
        where: {
          phoneNumber: phone,
          usedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async incrementOtpAttempts(id: string): Promise<void> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    await this.prisma.runUnrestricted(async () =>
      this.prisma.patientOtp.update({
        where: { id },
        data: { attempts: { increment: 1 } },
      }),
    );
  }

  async markOtpUsed(id: string): Promise<void> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    await this.prisma.runUnrestricted(async () =>
      this.prisma.patientOtp.update({
        where: { id },
        data: { usedAt: this.clock.now() },
      }),
    );
  }

  async createPortalUser(data: {
    email: string;
    password: string;
    role: User['role'];
    name: string;
  }): Promise<User> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.prisma.runUnrestricted(async () =>
      this.prisma.user.create({ data }),
    );
  }
}
