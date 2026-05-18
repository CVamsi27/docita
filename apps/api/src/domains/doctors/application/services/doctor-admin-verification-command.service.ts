import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DoctorVerificationStatus, Role } from '@workspace/db';
import { DoctorsQueryService } from './doctors-query.service';

/**
 * Handles platform-admin manual verification decisions for doctor accounts:
 * approve or reject with an audit trail. Extracted from DoctorsCommandService (SRP).
 */
@Injectable()
export class DoctorAdminVerificationCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryService: DoctorsQueryService,
  ) {}

  async adminVerifyDoctor(doctorId: string, adminId: string, note?: string) {
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      select: { id: true, role: true, registrationNumber: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.role !== Role.DOCTOR && doctor.role !== Role.ADMIN_DOCTOR) {
      throw new BadRequestException('Only doctor accounts can be verified');
    }
    if (!doctor.registrationNumber) {
      throw new BadRequestException(
        'Doctor must submit a registration number before verification',
      );
    }

    await this.prisma.user.update({
      where: { id: doctorId },
      data: {
        verificationStatus: DoctorVerificationStatus.VERIFIED,
        verificationSource: 'MANUAL_ADMIN',
        verificationReason: note?.trim() || null,
        verificationCheckedAt: new Date(),
        verifiedByAdminId: adminId,
        verifiedByAdminAt: new Date(),
      },
    });

    return this.queryService.findOne(doctorId);
  }

  async adminRejectDoctor(doctorId: string, adminId: string, reason: string) {
    const trimmed = reason?.trim();
    if (!trimmed) {
      throw new BadRequestException(
        'A rejection reason is required so the doctor knows what to fix',
      );
    }

    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      select: { id: true, role: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.role !== Role.DOCTOR && doctor.role !== Role.ADMIN_DOCTOR) {
      throw new BadRequestException('Only doctor accounts can be rejected');
    }

    await this.prisma.user.update({
      where: { id: doctorId },
      data: {
        verificationStatus: DoctorVerificationStatus.REJECTED,
        verificationSource: 'MANUAL_ADMIN',
        verificationReason: trimmed,
        verificationCheckedAt: new Date(),
        verifiedByAdminId: adminId,
        verifiedByAdminAt: new Date(),
      },
    });

    return this.queryService.findOne(doctorId);
  }
}
