import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';
import {
  STAFF_NOTIFICATION_TYPE_BY_RESPONSE,
  STAFF_PRIORITY_BY_PATIENT_RESPONSE,
  type PatientResponseType,
} from '@/domains/whatsapp/application/policies/patient-response.policy';
import {
  formatDate,
  formatTime,
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
  getPatientFullName,
} from '@workspace/utils';
import type {
  AppointmentContext,
  DelayContext,
} from './patient-response.types';

function isNonDelayPatientResponseType(
  responseType: PatientResponseType,
): responseType is Exclude<PatientResponseType, 'DELAY'> {
  return responseType !== 'DELAY';
}

@Injectable()
export class PatientResponseStaffNotificationService {
  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    private readonly staffNotification: StaffNotificationService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async notifyStaffForPatientResponse(
    appointment: AppointmentContext,
    responseType: PatientResponseType,
    originalMessage: string,
    responseId: string,
    delayContext: DelayContext,
  ): Promise<void> {
    const appointmentTime = formatTime(appointment.startTime, 'h:mm a', {
      timezone: DEFAULT_TIMEZONE,
    });

    const nextAppointmentTimeLabel = delayContext.nextAppointmentTime
      ? formatTime(delayContext.nextAppointmentTime, 'h:mm a', {
          timezone: DEFAULT_TIMEZONE,
        })
      : '';

    const variables = {
      clinicName: appointment.clinic.name,
      patientName: getPatientFullName(appointment.patient),
      date: formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM, {
        timezone: DEFAULT_TIMEZONE,
      }),
      time: appointmentTime,
      responseType: this.getResponseLabel(responseType, delayContext),
      message: originalMessage,
      delayMinutes:
        delayContext.delayMinutes !== null
          ? String(delayContext.delayMinutes)
          : '',
      delayMinutesPending: delayContext.delayMinutesPending ? 'yes' : 'no',
      conflictDetected: delayContext.conflictDetected ? 'yes' : 'no',
      nextAppointmentTime: nextAppointmentTimeLabel,
    };

    const responseLabel = this.getResponseLabel(responseType, delayContext);
    let notificationMessage = `${variables.patientName} responded "${responseLabel}" for appointment at ${appointmentTime}`;

    if (responseType === 'DELAY' && delayContext.conflictDetected) {
      notificationMessage += `. Potential schedule conflict with next appointment${nextAppointmentTimeLabel ? ` at ${nextAppointmentTimeLabel}` : ''}.`;
    }

    const priority = this.getNotificationPriority(responseType, delayContext);

    await this.staffNotification.notifyStaff({
      clinicId: appointment.clinic.id,
      doctorId: appointment.doctor.id,
      type: this.getStaffNotificationType(responseType),
      title: `Patient Response: ${responseLabel}`,
      message: notificationMessage,
      data: {
        appointmentId: appointment.id,
        responseId,
        responseType,
        patientName: variables.patientName,
        appointmentTime,
        delayMinutes: delayContext.delayMinutes,
        delayMinutesPending: delayContext.delayMinutesPending,
        conflictDetected: delayContext.conflictDetected,
        nextAppointmentTime: delayContext.nextAppointmentTime
          ? delayContext.nextAppointmentTime.toISOString()
          : null,
      },
      priority,
      templateVariables: variables,
    });

    await this.persistence.appointmentResponse.update({
      where: { id: responseId },
      data: {
        staffNotified: true,
        staffNotifiedAt: this.clock.now(),
      },
    });
  }

  private getResponseLabel(
    responseType: PatientResponseType,
    delayContext: DelayContext,
  ): string {
    if (responseType === 'DELAY') {
      if (delayContext.delayMinutesPending) return 'Delayed (minutes pending)';

      if (delayContext.delayMinutes !== null) {
        return `Delayed by ${delayContext.delayMinutes} min`;
      }

      return 'Delayed';
    }

    const labels: Record<Exclude<PatientResponseType, 'DELAY'>, string> = {
      CONFIRM: 'Confirmed',
      ON_THE_WAY: 'On time',
      RESCHEDULE: 'Wants to reschedule',
      CANCEL: 'Cancelled',
      UNKNOWN: 'Unknown response',
    };
    if (!isNonDelayPatientResponseType(responseType)) {
      return 'Unknown response';
    }
    return labels[responseType];
  }

  private getNotificationPriority(
    responseType: PatientResponseType,
    delayContext: DelayContext,
  ): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
    if (responseType === 'DELAY') {
      if (delayContext.conflictDetected) return 'HIGH';

      if (delayContext.delayMinutesPending) return 'HIGH';

      return 'NORMAL';
    }

    return STAFF_PRIORITY_BY_PATIENT_RESPONSE[responseType];
  }

  private getStaffNotificationType(
    responseType: PatientResponseType,
  ): 'PATIENT_RESPONSE' | 'APPOINTMENT_CANCEL' | 'APPOINTMENT_DELAY' {
    return STAFF_NOTIFICATION_TYPE_BY_RESPONSE[responseType];
  }
}
