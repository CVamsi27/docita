import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  DOCTOR_PERSISTENCE_PORT,
  type DoctorPersistencePort,
} from '@/domains/doctors/application/ports/doctor-persistence.port';
import { DoctorVerificationStatus, Role } from '@workspace/db';
import { DoctorsQueryService } from './doctors-query.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

/**
 * Handles platform-admin manual verification decisions for doctor accounts:
 * approve or reject with an audit trail. Extracted from DoctorsCommandService (SRP).
 */
@Injectable()
export class DoctorAdminVerificationCommandService {
  constructor(
    @Inject(DOCTOR_PERSISTENCE_PORT)
    private readonly persistence: DoctorPersistencePort,
    private readonly queryService: DoctorsQueryService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async adminVerifyDoctor(doctorId: string, adminId: string, note?: string) {
    const doctor = await this.persistence.user.findUnique({
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

    await this.persistence.user.update({
      where: { id: doctorId },
      data: {
        verificationStatus: DoctorVerificationStatus.VERIFIED,
        verificationSource: 'MANUAL_ADMIN',
        verificationReason: note?.trim() || null,
        verificationCheckedAt: this.clock.now(),
        verifiedByAdminId: adminId,
        verifiedByAdminAt: this.clock.now(),
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

    const doctor = await this.persistence.user.findUnique({
      where: { id: doctorId },
      select: { id: true, role: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.role !== Role.DOCTOR && doctor.role !== Role.ADMIN_DOCTOR) {
      throw new BadRequestException('Only doctor accounts can be rejected');
    }

    await this.persistence.user.update({
      where: { id: doctorId },
      data: {
        verificationStatus: DoctorVerificationStatus.REJECTED,
        verificationSource: 'MANUAL_ADMIN',
        verificationReason: trimmed,
        verificationCheckedAt: this.clock.now(),
        verifiedByAdminId: adminId,
        verifiedByAdminAt: this.clock.now(),
      },
    });

    return this.queryService.findOne(doctorId);
  }
}
