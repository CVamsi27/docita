import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentRequestStatus } from '@workspace/db';
import type {
  AppointmentRequestListResponse,
  AppointmentRequestResponse,
  ApproveAppointmentRequest,
  ListAppointmentRequestsQuery,
  PatientAppointmentRequestCreate,
  RejectAppointmentRequest,
} from '@workspace/types';
import {
  APPOINTMENT_REQUEST_REPOSITORY_TOKEN,
  AppointmentRequestWithRelations,
  IAppointmentRequestRepository,
} from '@/domains/appointments/core/repositories/appointment-request.repository.interface';
import { AppointmentService } from '@/domains/appointments/application/services/appointment.service';
import { SystemEventsService } from '@/shared/modules/messaging/whatsapp/system-events.service';

@Injectable()
export class AppointmentRequestService {
  constructor(
    @Inject(APPOINTMENT_REQUEST_REPOSITORY_TOKEN)
    private readonly appointmentRequestRepository: IAppointmentRequestRepository,
    private readonly appointmentService: AppointmentService,
    private readonly systemEvents: SystemEventsService,
  ) {}

  private parseDate(value: string, fieldName: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }
    return date;
  }

  private mapRequest(
    request: AppointmentRequestWithRelations,
  ): AppointmentRequestResponse {
    return {
      id: request.id,
      patientId: request.patientId,
      clinicId: request.clinicId,
      preferredDoctorId: request.preferredDoctorId,
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      requestedSlotStart: request.requestedSlotStart ?? undefined,
      requestedSlotEnd: request.requestedSlotEnd ?? undefined,
      reason: request.reason,
      notes: request.notes,
      status: request.status,
      reviewedById: request.reviewedById,
      reviewedAt: request.reviewedAt,
      responseMessage: request.responseMessage,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      patient: request.patient ?? undefined,
      preferredDoctor: request.preferredDoctor ?? undefined,
      reviewedBy: request.reviewedBy ?? undefined,
    };
  }

  async createPatientRequest(
    patientId: string,
    clinicId: string,
    data: PatientAppointmentRequestCreate,
  ): Promise<AppointmentRequestResponse> {
    if (data.preferredDoctorId) {
      await this.assertDoctorBelongsToClinic(data.preferredDoctorId, clinicId);
    }

    let preferredDate = this.parseDate(data.preferredDate, 'Preferred date');
    let requestedSlotStart: Date | undefined;
    let requestedSlotEnd: Date | undefined;
    if (data.requestedSlotStart && data.requestedSlotEnd) {
      requestedSlotStart = this.parseDate(
        data.requestedSlotStart,
        'Requested slot start',
      );
      requestedSlotEnd = this.parseDate(
        data.requestedSlotEnd,
        'Requested slot end',
      );
      preferredDate = requestedSlotStart;
    }

    const request = await this.appointmentRequestRepository.create({
      patientId,
      clinicId,
      preferredDoctorId: data.preferredDoctorId,
      preferredDate,
      preferredTime: data.preferredTime,
      requestedSlotStart,
      requestedSlotEnd,
      reason: data.reason,
      notes: data.notes,
    });

    return this.mapRequest(request);
  }

  async listRequests(
    clinicId: string,
    filters: ListAppointmentRequestsQuery = {},
  ): Promise<AppointmentRequestListResponse> {
    const take = filters.limit ?? 20;
    const skip = filters.offset ?? 0;
    const { items, total } =
      await this.appointmentRequestRepository.findForClinic({
        clinicId,
        patientId: filters.patientId,
        status: filters.status,
        from: filters.from
          ? this.parseDate(filters.from, 'From date')
          : undefined,
        to: filters.to ? this.parseDate(filters.to, 'To date') : undefined,
        take,
        skip,
      });

    return {
      items: items.map((item) => this.mapRequest(item)),
      count: total,
      hasMore: skip + items.length < total,
    };
  }

  async approveRequest(
    id: string,
    clinicId: string,
    reviewedById: string,
    data: ApproveAppointmentRequest,
  ): Promise<AppointmentRequestResponse> {
    const request = await this.findPendingRequest(id, clinicId);
    await this.assertDoctorBelongsToClinic(data.doctorId, clinicId);

    const appointment = await this.appointmentService.createAppointment({
      clinicId,
      patientId: request.patientId,
      doctorId: data.doctorId,
      startTime: this.parseDate(data.startTime, 'Start time'),
      endTime: this.parseDate(data.endTime, 'End time'),
      reason: data.notes ?? request.notes ?? request.reason,
      type: data.type ?? 'Standard',
    });

    await this.systemEvents.sendAppointmentConfirmation(
      appointment.id,
      clinicId,
    );

    const updated = await this.appointmentRequestRepository.update(id, {
      status: AppointmentRequestStatus.APPROVED,
      reviewedBy: { connect: { id: reviewedById } },
      reviewedAt: new Date(),
      responseMessage: `Booked appointment ${appointment.id}`,
    });

    return this.mapRequest(updated);
  }

  async rejectRequest(
    id: string,
    clinicId: string,
    reviewedById: string,
    data: RejectAppointmentRequest,
  ): Promise<AppointmentRequestResponse> {
    await this.findPendingRequest(id, clinicId);
    const updated = await this.appointmentRequestRepository.update(id, {
      status: AppointmentRequestStatus.REJECTED,
      reviewedBy: { connect: { id: reviewedById } },
      reviewedAt: new Date(),
      responseMessage: data.responseMessage,
    });

    return this.mapRequest(updated);
  }

  private async findPendingRequest(
    id: string,
    clinicId: string,
  ): Promise<AppointmentRequestWithRelations> {
    const request = await this.appointmentRequestRepository.findByIdAndClinic(
      id,
      clinicId,
    );
    if (!request) {
      throw new NotFoundException('Appointment request not found');
    }
    if (request.status !== AppointmentRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending appointment requests can be reviewed',
      );
    }
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
    if (!doctorBelongsToClinic) {
      throw new BadRequestException('Selected doctor is not available here');
    }
  }
}
