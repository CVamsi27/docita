import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Role } from '@workspace/db';
import { PrismaService } from '../../../../prisma/prisma.service';

type VerificationResult = {
  status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'FAILED';
  source: string;
  reference?: string;
  reason?: string;
  data?: unknown;
};

@Injectable()
export class DoctorVerificationService {
  private readonly logger = new Logger(DoctorVerificationService.name);
  private readonly verificationSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    registrationNumber: true,
    licenseNumber: true,
    signatureUrl: true,
    signatureUploadedAt: true,
    verificationStatus: true,
    verificationSource: true,
    verificationRef: true,
    verificationReason: true,
    verificationData: true,
    verificationCheckedAt: true,
    updatedAt: true,
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  async verifyAndPersistDoctorVerification(doctorId: string) {
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        name: true,
        role: true,
        registrationNumber: true,
        licenseNumber: true,
      },
    });

    if (!doctor) {
      return null;
    }

    if (doctor.role !== Role.DOCTOR && doctor.role !== Role.ADMIN_DOCTOR) {
      return null;
    }

    if (!doctor.registrationNumber) {
      await this.prisma.$executeRaw`
        UPDATE "User"
        SET
          "verificationStatus" = 'UNVERIFIED',
          "verificationSource" = 'NMC',
          "verificationReason" = 'Registration number is required',
          "verificationCheckedAt" = NOW()
        WHERE "id" = ${doctorId}
      `;

      return this.prisma.user.findUnique({
        where: { id: doctorId },
        select: this.verificationSelect,
      });
    }

    await this.prisma.$executeRaw`
      UPDATE "User"
      SET
        "verificationStatus" = 'PENDING',
        "verificationSource" = 'NMC',
        "verificationReason" = NULL
      WHERE "id" = ${doctorId}
    `;

    const result = await this.verifyWithProvider({
      id: doctor.id,
      name: doctor.name,
      registrationNumber: doctor.registrationNumber,
      licenseNumber: doctor.licenseNumber ?? undefined,
    });

    await this.prisma.$executeRaw`
      UPDATE "User"
      SET
        "verificationStatus" = ${result.status},
        "verificationSource" = ${result.source},
        "verificationRef" = ${result.reference ?? null},
        "verificationReason" = ${result.reason ?? null},
        "verificationCheckedAt" = NOW()
      WHERE "id" = ${doctorId}
    `;

    return this.prisma.user.findUnique({
      where: { id: doctorId },
      select: this.verificationSelect,
    });
  }

  @Cron('0 3 * * *')
  async reverifyDoctorsNightly() {
    const doctors = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.DOCTOR, Role.ADMIN_DOCTOR] },
        registrationNumber: { not: null },
      },
      select: { id: true },
      take: 500,
    });

    for (const doctor of doctors) {
      try {
        await this.verifyAndPersistDoctorVerification(doctor.id);
      } catch (error) {
        this.logger.warn(
          `Nightly re-verification failed for doctor ${doctor.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }
  }

  private async verifyWithProvider(input: {
    id: string;
    name: string;
    registrationNumber: string;
    licenseNumber?: string;
  }): Promise<VerificationResult> {
    const endpoint = process.env.DOCTOR_VERIFICATION_API_URL;

    if (!endpoint) {
      return {
        status: 'FAILED',
        source: 'NMC',
        reason:
          'Government verification provider is not configured. Set DOCTOR_VERIFICATION_API_URL.',
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.DOCTOR_VERIFICATION_API_KEY
            ? {
                Authorization: `Bearer ${process.env.DOCTOR_VERIFICATION_API_KEY}`,
              }
            : {}),
        },
        body: JSON.stringify({
          doctorId: input.id,
          name: input.name,
          registrationNumber: input.registrationNumber,
          licenseNumber: input.licenseNumber,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          status: 'FAILED',
          source: 'NMC',
          reason: `Verification provider error (${response.status})`,
        };
      }

      const payload = (await response.json()) as {
        verified?: boolean;
        referenceId?: string;
        reason?: string;
        source?: string;
        status?: string;
        data?: unknown;
      };

      if (payload.verified) {
        return {
          status: 'VERIFIED',
          source: payload.source || 'NMC',
          reference: payload.referenceId,
          data: payload.data,
        };
      }

      return {
        status: payload.status === 'FAILED' ? 'FAILED' : 'REJECTED',
        source: payload.source || 'NMC',
        reference: payload.referenceId,
        reason: payload.reason || 'Registration could not be verified',
        data: payload.data,
      };
    } catch (error) {
      return {
        status: 'FAILED',
        source: 'NMC',
        reason:
          error instanceof Error
            ? `Verification request failed: ${error.message}`
            : 'Verification request failed',
      };
    }
  }
}
