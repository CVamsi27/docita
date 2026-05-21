import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { AppointmentStatus } from '@workspace/db';
import {
  APPOINTMENT_STATUS_BY_PATIENT_RESPONSE,
  type PatientResponseType,
} from '@/domains/whatsapp/application/policies/patient-response.policy';
import { PatientResponseConfirmationService } from './patient-response-confirmation.service';
import { PatientResponseStaffNotificationService } from './patient-response-staff-notification.service';
import {
  extractDelayMinutes,
  parsePatientResponse,
} from './patient-response-parser.helper';
import {
  toAppointmentContext,
  type AppointmentContext,
  type DelayContext,
} from './patient-response.types';

const DELAY_MINUTES_PENDING_NOTE = 'delay_minutes_pending';
const DELAY_FOLLOW_UP_WINDOW_HOURS = 6;

/**
 * Facade — orchestrates inbound patient replies; confirmations and staff alerts
 * delegate to PatientResponseConfirmationService and PatientResponseStaffNotificationService.
 */
@Injectable()
export class ResponseHandlerService {
  private readonly logger = new Logger(ResponseHandlerService.name);

  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    private readonly patientConfirmation: PatientResponseConfirmationService,
    private readonly patientStaffNotification: PatientResponseStaffNotificationService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async handlePatientResponse(
    appointmentId: string,
    responseText: string,
    _phoneNumber: string,
    _messageSid: string,
  ): Promise<void> {
    this.logger.log(
      `Processing response for appointment ${appointmentId}: ${responseText}`,
    );

    const appointment = await this.persistence.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
      },
    });

    if (!appointment) {
      this.logger.warn(`Appointment not found: ${appointmentId}`);
      return;
    }

    const appointmentContext = toAppointmentContext(appointment);
    if (!appointmentContext) {
      this.logger.warn(
        `Appointment ${appointmentId} is missing patient, doctor, or clinic relations`,
      );
      return;
    }

    const responseType = parsePatientResponse(responseText);
    const delayMinutes = extractDelayMinutes(responseText);
    const pendingDelayResponse =
      await this.findPendingDelayResponse(appointmentId);

    if (
      pendingDelayResponse &&
      delayMinutes !== null &&
      (responseType === 'UNKNOWN' || responseType === 'DELAY')
    ) {
      await this.handleDelayMinutesFollowUp(
        appointmentContext,
        pendingDelayResponse.id,
        responseText,
        delayMinutes,
      );
      this.logger.log(
        `Delay follow-up processed for appointment ${appointmentId} with ${delayMinutes} minutes`,
      );
      return;
    }

    const delayMinutesPending =
      responseType === 'DELAY' && delayMinutes === null;

    const response = await this.persistence.appointmentResponse.create({
      data: {
        appointmentId,
        responseType,
        patientMessage: responseText,
        delayMinutes,
        notes: delayMinutesPending ? DELAY_MINUTES_PENDING_NOTE : null,
      },
    });

    await this.updateAppointmentStatus(appointment.id, responseType);

    let nextAppointmentTime: Date | null = null;
    let conflictDetected = false;

    if (responseType === 'DELAY' && delayMinutes !== null) {
      const conflict = await this.evaluateDelayConflict(
        appointment.id,
        appointment.clinic.id,
        appointment.doctor.id,
        appointment.startTime,
        delayMinutes,
      );
      nextAppointmentTime = conflict.nextAppointmentTime;
      conflictDetected = conflict.conflictDetected;
    }

    const delayContext: DelayContext = {
      delayMinutes,
      delayMinutesPending,
      conflictDetected,
      nextAppointmentTime,
    };

    await this.patientConfirmation.sendPatientConfirmation(
      appointmentContext,
      responseType,
      delayContext,
    );

    await this.patientStaffNotification.notifyStaffForPatientResponse(
      appointmentContext,
      responseType,
      responseText,
      response.id,
      delayContext,
    );

    this.logger.log(
      `Response processed: ${responseType} for appointment ${appointmentId}`,
    );
  }

  private async findPendingDelayResponse(
    appointmentId: string,
  ): Promise<{ id: string } | null> {
    const now = this.clock.now();
    const windowStart = new Date(
      now.getTime() - DELAY_FOLLOW_UP_WINDOW_HOURS * 60 * 60 * 1000,
    );

    const pending = await this.persistence.appointmentResponse.findFirst({
      where: {
        appointmentId,
        responseType: 'DELAY',
        delayMinutes: null,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    return pending;
  }

  private async handleDelayMinutesFollowUp(
    appointment: AppointmentContext,
    responseId: string,
    responseText: string,
    delayMinutes: number,
  ): Promise<void> {
    const conflict = await this.evaluateDelayConflict(
      appointment.id,
      appointment.clinic.id,
      appointment.doctor.id,
      appointment.startTime,
      delayMinutes,
    );

    await this.persistence.appointmentResponse.update({
      where: { id: responseId },
      data: {
        delayMinutes,
        patientMessage: responseText,
        notes: conflict.conflictDetected
          ? 'delay_minutes_confirmed_conflict'
          : 'delay_minutes_confirmed',
      },
    });

    await this.patientConfirmation.sendDelayMinutesConfirmation(
      appointment,
      delayMinutes,
      conflict.conflictDetected,
    );

    await this.patientStaffNotification.notifyStaffForPatientResponse(
      appointment,
      'DELAY',
      responseText,
      responseId,
      {
        delayMinutes,
        delayMinutesPending: false,
        conflictDetected: conflict.conflictDetected,
        nextAppointmentTime: conflict.nextAppointmentTime,
      },
    );
  }

  private async evaluateDelayConflict(
    appointmentId: string,
    clinicId: string,
    doctorId: string,
    appointmentStart: Date,
    delayMinutes: number,
  ): Promise<{ conflictDetected: boolean; nextAppointmentTime: Date | null }> {
    const expectedArrival = new Date(
      appointmentStart.getTime() + delayMinutes * 60 * 1000,
    );

    const nextAppointment = await this.persistence.appointment.findFirst({
      where: {
        id: { not: appointmentId },
        clinicId,
        doctorId,
        startTime: { gt: appointmentStart },
        status: {
          in: [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
          ],
        },
      },
      orderBy: { startTime: 'asc' },
      select: { startTime: true },
    });

    if (!nextAppointment) {
      return { conflictDetected: false, nextAppointmentTime: null };
    }

    return {
      conflictDetected: expectedArrival >= nextAppointment.startTime,
      nextAppointmentTime: nextAppointment.startTime,
    };
  }

  private async updateAppointmentStatus(
    appointmentId: string,
    responseType: PatientResponseType,
  ): Promise<void> {
    const newStatus = APPOINTMENT_STATUS_BY_PATIENT_RESPONSE[responseType];

    if (newStatus) {
      await this.persistence.appointment.update({
        where: { id: appointmentId },
        data: { status: newStatus },
      });
    }
  }
}
