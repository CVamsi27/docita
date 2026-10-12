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

  async tryConsumeOtpAttempt(
    id: string,
    maxAttempts: number,
  ): Promise<boolean> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS.
    //
    // The WHERE clause is part of the security contract: the increment and
    // the cap-check are a single atomic UPDATE. Doing the check in
    // application code (read attempts, increment, re-read, check) leaves a
    // race window where concurrent verifyOtp calls all see attempts < cap
    // and all proceed to bcrypt.compare — letting an attacker fan out
    // thousands of parallel requests and bypass the per-OTP attempt limit.
    // The conditional update here closes that window: if `updateMany` reports
    // count = 0, either the row no longer exists or the cap was already
    // reached. Either way the caller must reject the attempt.
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    const result = await this.prisma.runUnrestricted(async () =>
      this.prisma.patientOtp.updateMany({
        where: { id, attempts: { lt: maxAttempts } },
        data: { attempts: { increment: 1 } },
      }),
    );
    return result.count === 1;
  }

  async tryMarkOtpUsed(id: string): Promise<boolean> {
    // Single-use claim: `usedAt: null` is the contract, not an optimization.
    // Concurrent verifies with the same valid OTP both pass attempt
    // consumption and bcrypt.compare; only the caller whose conditional
    // UPDATE matches the row may issue a session.
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    const result = await this.prisma.runUnrestricted(async () =>
      this.prisma.patientOtp.updateMany({
        where: { id, usedAt: null },
        data: { usedAt: this.clock.now() },
      }),
    );
    return result.count === 1;
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
