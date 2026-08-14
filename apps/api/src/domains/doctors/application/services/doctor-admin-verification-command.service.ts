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
import { AuditService } from '@/shared/modules/audit/audit/audit.service';

const AUDIT_ACTION_OVERRIDE = 'DOCTOR_VERIFICATION_OVERRIDDEN';

/**
 * Handles platform-admin manual verification decisions for doctor accounts:
 * approve or reject with an explicit audit trail. Extracted from
 * DoctorsCommandService (SRP).
 *
 * Security contract (P5.18): a manual override is only allowed for a support
 * ticket reference, and every override writes an audit row before the user row
 * is touched. The audit write is awaited and rethrows on failure, so an
 * override can never land without its audit trail (fail-closed ordering).
 *
 * Tradeoff: `AuditService.logAction` is not transactional with the user-row
 * update, so a failure between the two writes leaves a traceable-but-spurious
 * audit row claiming an override that never happened. That is reviewable in
 * the audit log (decision + ticket id) and preferred over the inverse — an
 * override without any record.
 */
@Injectable()
export class DoctorAdminVerificationCommandService {
  constructor(
    @Inject(DOCTOR_PERSISTENCE_PORT)
    private readonly persistence: DoctorPersistencePort,
    private readonly queryService: DoctorsQueryService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly auditService: AuditService,
  ) {}

  private requireTicketId(ticketId: string | undefined): string {
    const trimmed = ticketId?.trim();
    if (!trimmed || trimmed.length < 3)
      throw new BadRequestException(
        'A support ticket id is required for manual verification overrides',
      );
    return trimmed;
  }

  /**
   * Shared pre-flight for both override decisions: fetch the doctor and fail
   * closed when it is missing, not a doctor account, or has no clinic.
   */
  private async findDoctorForOverride(
    doctorId: string,
    invalidRoleMessage: string,
    requireRegistrationNumber: boolean,
  ): Promise<{
    id: string;
    clinicId: string;
    verificationStatus: DoctorVerificationStatus;
  }> {
    const doctor = await this.persistence.user.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        role: true,
        clinicId: true,
        registrationNumber: true,
        verificationStatus: true,
      },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.role !== Role.DOCTOR && doctor.role !== Role.ADMIN_DOCTOR)
      throw new BadRequestException(invalidRoleMessage);
    if (requireRegistrationNumber && !doctor.registrationNumber)
      throw new BadRequestException(
        'Doctor must submit a registration number before verification',
      );
    if (!doctor.clinicId)
      throw new BadRequestException(
        'Doctor is not associated with a clinic and cannot be overridden',
      );
    return {
      id: doctor.id,
      clinicId: doctor.clinicId,
      verificationStatus: doctor.verificationStatus,
    };
  }

  /**
   * Explicit audit row for an override decision. Written BEFORE the user-row
   * mutation (fail-closed): a support override never lands without its trail.
   */
  private async logOverrideAudit(
    doctorId: string,
    adminId: string,
    doctor: { clinicId: string; verificationStatus: DoctorVerificationStatus },
    decision: DoctorVerificationStatus,
    metadata: Record<string, unknown>,
  ) {
    await this.auditService.logAction({
      clinicId: doctor.clinicId,
      userId: adminId,
      actionType: AUDIT_ACTION_OVERRIDE,
      resourceType: 'Doctor',
      resourceId: doctorId,
      changes: {
        verificationStatus: {
          before: doctor.verificationStatus,
          after: decision,
        },
      },
      metadata: { decision, ...metadata },
    });
  }

  async adminVerifyDoctor(
    doctorId: string,
    adminId: string,
    ticketId: string,
    note?: string,
  ) {
    const ticket = this.requireTicketId(ticketId);
    const trimmedNote = note?.trim() || null;

    const doctor = await this.findDoctorForOverride(
      doctorId,
      'Only doctor accounts can be verified',
      true,
    );

    await this.logOverrideAudit(
      doctorId,
      adminId,
      doctor,
      DoctorVerificationStatus.VERIFIED,
      { ticketId: ticket, note: trimmedNote },
    );

    await this.persistence.user.update({
      where: { id: doctorId },
      data: {
        verificationStatus: DoctorVerificationStatus.VERIFIED,
        verificationSource: 'MANUAL_ADMIN',
        verificationReason: trimmedNote,
        verificationCheckedAt: this.clock.now(),
        verifiedByAdminId: adminId,
        verifiedByAdminAt: this.clock.now(),
      },
    });

    return this.queryService.findOne(doctorId);
  }

  async adminRejectDoctor(
    doctorId: string,
    adminId: string,
    ticketId: string,
    reason: string,
  ) {
    const ticket = this.requireTicketId(ticketId);
    const trimmed = reason?.trim();
    if (!trimmed)
      throw new BadRequestException(
        'A rejection reason is required so the doctor knows what to fix',
      );

    const doctor = await this.findDoctorForOverride(
      doctorId,
      'Only doctor accounts can be rejected',
      false,
    );

    await this.logOverrideAudit(
      doctorId,
      adminId,
      doctor,
      DoctorVerificationStatus.REJECTED,
      { ticketId: ticket, reason: trimmed },
    );

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
