import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentRequestStatus } from '@workspace/db';
import { createHash } from 'crypto';
import type {
  AppointmentRequestResponse,
  ApproveAppointmentRequest,
  PatientAppointmentRequestCreate,
  RejectAppointmentRequest,
} from '@workspace/types';
import {
  APPOINTMENT_REQUEST_REPOSITORY_TOKEN,
  AppointmentRequestWithRelations,
  IAppointmentRequestRepository,
} from '@/domains/appointments/core/repositories/appointment-request.repository.interface';
import { AppointmentService } from '@/domains/appointments/application/services/appointment.service';
import {
  StaffNotificationService,
  type StaffNotificationPayload,
} from '@/domains/whatsapp/application/services/staff-notification.service';
import { isUniqueConstraintOn } from '@/shared/common/prisma/unique-constraint';
import {
  mapAppointmentRequest,
  parseAppointmentRequestDate,
} from './appointment-request.helpers';

/**
 * Identity of a held public-booking slot: one patient asking for one doctor at
 * one time. A different patient asking for the same time gets its own key, so
 * the hold can never be used to probe other patients' requests.
 */
function buildPendingSlotKey(input: {
  clinicId: string;
  patientId: string;
  doctorId: string;
  slotStart: Date;
}): string {
  return createHash('sha256')
    .update(
      [
        input.clinicId,
        input.patientId,
        input.doctorId,
        input.slotStart.toISOString(),
      ].join('|'),
    )
    .digest('hex');
}

@Injectable()
export class AppointmentRequestCommandService {
  private readonly logger = new Logger(AppointmentRequestCommandService.name);

  constructor(
    @Inject(APPOINTMENT_REQUEST_REPOSITORY_TOKEN)
    private readonly appointmentRequestRepository: IAppointmentRequestRepository,
    private readonly appointmentService: AppointmentService,
    private readonly staffNotifications: StaffNotificationService,
  ) {}

  async createPatientRequest(
    patientId: string,
    clinicId: string,
    data: PatientAppointmentRequestCreate,
  ): Promise<AppointmentRequestResponse> {
    if (data.preferredDoctorId) {
      await this.assertDoctorBelongsToClinic(data.preferredDoctorId, clinicId);
    }
    let preferredDate = parseAppointmentRequestDate(
      data.preferredDate,
      'Preferred date',
    );
    let requestedSlotStart: Date | undefined;
    let requestedSlotEnd: Date | undefined;
    if (data.requestedSlotStart && data.requestedSlotEnd) {
      requestedSlotStart = parseAppointmentRequestDate(
        data.requestedSlotStart,
        'Requested slot start',
      );
      requestedSlotEnd = parseAppointmentRequestDate(
        data.requestedSlotEnd,
        'Requested slot end',
      );
      preferredDate = requestedSlotStart;
    }

    // A public booking request is a candidate, not a booking: the clinic's
    // approval is the final authorization. While it is pending it holds the
    // slot it names, so a retried or double-tapped submission returns the
    // original request instead of filing a second one for the same doctor and
    // time. The unique index is the hard guarantee; the pre-check below only
    // avoids the throw in the common case.
    const pendingSlotKey =
      requestedSlotStart && data.preferredDoctorId
        ? buildPendingSlotKey({
            clinicId,
            patientId,
            doctorId: data.preferredDoctorId,
            slotStart: requestedSlotStart,
          })
        : undefined;

    if (pendingSlotKey) {
      const existing =
        await this.appointmentRequestRepository.findPendingBySlotKey(
          pendingSlotKey,
        );
      if (existing) return mapAppointmentRequest(existing);
    }

    let request: AppointmentRequestWithRelations;
    try {
      request = await this.appointmentRequestRepository.create({
        patientId,
        clinicId,
        preferredDoctorId: data.preferredDoctorId,
        preferredDate,
        preferredTime: data.preferredTime,
        requestedSlotStart,
        requestedSlotEnd,
        reason: data.reason,
        notes: data.notes,
        pendingSlotKey,
      });
    } catch (error) {
      if (pendingSlotKey && isUniqueConstraintOn(error, 'pendingSlotKey')) {
        // A concurrent submission won the index race. Both callers wanted the
        // same doctor at the same time for the same patient, so the winner is
        // this request: return it rather than failing the retry.
        const winner =
          await this.appointmentRequestRepository.findPendingBySlotKey(
            pendingSlotKey,
          );
        if (winner) return mapAppointmentRequest(winner);
      }
      throw error;
    }

    await this.notifyStaffBestEffort({
      clinicId,
      doctorId: data.preferredDoctorId ?? undefined,
      type: 'APPOINTMENT_REQUEST_CREATED',
      title: 'New appointment request',
      message: 'A patient requested an appointment via the booking portal.',
      data: {
        appointmentRequestId: request.id,
        patientId,
        preferredDoctorId: data.preferredDoctorId ?? null,
        preferredDate: preferredDate.toISOString(),
        preferredTime: data.preferredTime ?? null,
        requestedSlotStart: requestedSlotStart?.toISOString() ?? null,
        requestedSlotEnd: requestedSlotEnd?.toISOString() ?? null,
      },
      priority: 'HIGH',
      sendWhatsApp: false,
      sendInApp: true,
    });

    return mapAppointmentRequest(request);
  }

  async approveRequest(
    id: string,
    clinicId: string,
    reviewedById: string,
    data: ApproveAppointmentRequest,
  ): Promise<AppointmentRequestResponse> {
    const request = await this.findPendingRequest(id, clinicId);
    await this.assertDoctorBelongsToClinic(data.doctorId, clinicId);
    const startTime = parseAppointmentRequestDate(data.startTime, 'Start time');
    const endTime = parseAppointmentRequestDate(data.endTime, 'End time');

    // Claim the request before booking so a concurrent second approval (or an
    // approve/reject race) loses here as a no-op instead of creating a
    // duplicate appointment.
    const claimed = await this.appointmentRequestRepository.markReviewed({
      id,
      clinicId,
      status: AppointmentRequestStatus.APPROVED,
      reviewedById,
      responseMessage: '',
      expectedStatus: AppointmentRequestStatus.PENDING,
    });
    if (!claimed) {
      throw new ConflictException(
        'Appointment request was already reviewed by someone else',
      );
    }

    const appointmentReason = data.notes ?? request.notes ?? request.reason;
    const appointment =
      await this.appointmentRequestRepository.findMatchingAppointment({
        clinicId,
        patientId: request.patientId,
        doctorId: data.doctorId,
        startTime,
        endTime,
        reason: appointmentReason,
        requestCreatedAt: request.createdAt,
      });
    const appointmentId =
      appointment?.id ??
      (
        await this.appointmentService.createAppointment({
          clinicId,
          patientId: request.patientId,
          doctorId: data.doctorId,
          startTime,
          endTime,
          reason: appointmentReason,
          type: data.type ?? 'Standard',
        })
      ).id;
    const updated = await this.appointmentRequestRepository.update(
      id,
      clinicId,
      {
        responseMessage: `Booked appointment ${appointmentId}`,
      },
    );
    await this.notifyStaffBestEffort({
      clinicId,
      doctorId: data.doctorId,
      type: 'APPOINTMENT_REQUEST_APPROVED',
      title: 'Appointment request approved',
      message: 'A patient appointment request was approved and booked.',
      data: {
        appointmentRequestId: updated.id,
        appointmentId,
        patientId: updated.patientId,
      },
      priority: 'NORMAL',
      sendWhatsApp: false,
      sendInApp: true,
    });
    return mapAppointmentRequest(updated);
  }

  async rejectRequest(
    id: string,
    clinicId: string,
    reviewedById: string,
    data: RejectAppointmentRequest,
  ): Promise<AppointmentRequestResponse> {
    await this.findPendingRequest(id, clinicId);
    const updated = await this.appointmentRequestRepository.markReviewed({
      id,
      clinicId,
      status: AppointmentRequestStatus.REJECTED,
      reviewedById,
      responseMessage: data.responseMessage,
      expectedStatus: AppointmentRequestStatus.PENDING,
    });
    if (!updated) {
      throw new ConflictException(
        'Appointment request was already reviewed by someone else',
      );
    }

    await this.notifyStaffBestEffort({
      clinicId,
      type: 'APPOINTMENT_REQUEST_REJECTED',
      title: 'Appointment request rejected',
      message: 'A patient appointment request was rejected.',
      data: {
        appointmentRequestId: updated.id,
        patientId: updated.patientId,
      },
      priority: 'LOW',
      sendWhatsApp: false,
      sendInApp: true,
    });

    return mapAppointmentRequest(updated);
  }

  private async notifyStaffBestEffort(
    payload: StaffNotificationPayload,
  ): Promise<void> {
    try {
      await this.staffNotifications.notifyStaff(payload);
    } catch (error) {
      this.logger.warn(
        `Failed to send ${payload.type} notification for clinic ${payload.clinicId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async findPendingRequest(
    id: string,
    clinicId: string,
  ): Promise<AppointmentRequestWithRelations> {
    const request = await this.appointmentRequestRepository.findByIdAndClinic(
      id,
      clinicId,
    );
    if (!request) throw new NotFoundException('Appointment request not found');
    if (request.status !== AppointmentRequestStatus.PENDING)
      throw new BadRequestException(
        'Only pending appointment requests can be reviewed',
      );
    return request;
  }

  private async assertDoctorBelongsToClinic(
    doctorId: string,
    clinicId: string,
  ) {
    const doctorBelongsToClinic =
      await this.appointmentRequestRepository.doctorBelongsToClinic(
        doctorId,
        clinicId,
      );
    if (!doctorBelongsToClinic)
      throw new BadRequestException('Selected doctor is not available here');
  }
}
