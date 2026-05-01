import { Injectable } from '@nestjs/common';
import { DoctorVerificationStatus, Prisma, Role } from '@workspace/db';
import { JsonValue } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IDoctorVerificationRepository,
  DoctorForVerification,
  DoctorVerificationRecord,
} from '@/domains/doctors/core/repositories/doctor-verification.repository.interface';

const VERIFICATION_SELECT = {
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

@Injectable()
export class PrismaDoctorVerificationRepository implements IDoctorVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  private toInputJsonValue(value: JsonValue): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  async findDoctorForVerification(
    doctorId: string,
  ): Promise<DoctorForVerification | null> {
    return this.getReadClient().user.findFirst({
      where: { id: doctorId },
      select: {
        id: true,
        name: true,
        role: true,
        registrationNumber: true,
        registrationCouncil: true,
        registrationStateCode: true,
        licenseNumber: true,
      },
    });
  }

  async findDoctorVerificationRecord(
    doctorId: string,
  ): Promise<DoctorVerificationRecord | null> {
    return this.getReadClient().user.findFirst({
      where: { id: doctorId },
      select: VERIFICATION_SELECT,
    });
  }

  async findDoctorLicenseExpiry(doctorId: string) {
    return this.getReadClient().user.findFirst({
      where: { id: doctorId },
      select: { licenseExpiry: true },
    });
  }

  async findDoctorsForReverification(): Promise<Array<{ id: string }>> {
    return this.getReadClient().user.findMany({
      where: {
        role: { in: [Role.DOCTOR, Role.ADMIN_DOCTOR] },
        registrationNumber: { not: null },
      },
      select: { id: true },
      take: 500,
    });
  }

  async updateVerificationStatus(
    doctorId: string,
    data: {
      verificationStatus: DoctorVerificationStatus;
      verificationSource?: string;
      verificationRef?: string | null;
      verificationReason?: string | null;
      verificationData?: JsonValue;
      verificationCheckedAt: Date;
    },
  ): Promise<void> {
    const result = await this.prisma.user.updateMany({
      where: { id: doctorId },
      data: {
        verificationStatus: data.verificationStatus,
        ...(data.verificationSource !== undefined && {
          verificationSource: data.verificationSource,
        }),
        ...(data.verificationRef !== undefined && {
          verificationRef: data.verificationRef,
        }),
        ...(data.verificationReason !== undefined && {
          verificationReason: data.verificationReason,
        }),
        ...(data.verificationData !== undefined && {
          verificationData: this.toInputJsonValue(data.verificationData),
        }),
        verificationCheckedAt: data.verificationCheckedAt,
      },
    });

    if (result.count === 0) {
      throw new Error(`Doctor ${doctorId} not found`);
    }
  }
}
