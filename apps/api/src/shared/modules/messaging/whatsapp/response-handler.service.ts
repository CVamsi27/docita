import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WhatsappClientService } from './whatsapp-client.service';
import { TemplatesService } from './templates.service';
import { StaffNotificationService } from './staff-notification.service';
import { AppointmentStatus } from '@workspace/db';
import {
  formatDate,
  formatTime,
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
} from '@workspace/utils';

type PatientResponseType =
  | 'CONFIRM'
  | 'ON_THE_WAY'
  | 'DELAY'
  | 'RESCHEDULE'
  | 'CANCEL'
  | 'UNKNOWN';

const DELAY_MINUTES_PENDING_NOTE = 'delay_minutes_pending';
const DELAY_FOLLOW_UP_WINDOW_HOURS = 6;

const EXACT_RESPONSE_MAPPING: Record<string, PatientResponseType> = {
  btn_confirm: 'CONFIRM',
  btn_on_the_way: 'ON_THE_WAY',
  btn_on_time: 'ON_THE_WAY',
  btn_delay: 'DELAY',
  btn_delayed: 'DELAY',
  btn_reschedule: 'RESCHEDULE',
  btn_cancel: 'CANCEL',
  btn_cancelled: 'CANCEL',

  confirm: 'CONFIRM',
  on_the_way: 'ON_THE_WAY',
  on_time: 'ON_THE_WAY',
  ontime: 'ON_THE_WAY',
  delay: 'DELAY',
  delayed: 'DELAY',
  reschedule: 'RESCHEDULE',
  cancel: 'CANCEL',
  cancelled: 'CANCEL',
  canceled: 'CANCEL',

  '1': 'CONFIRM',
  '2': 'DELAY',
  '3': 'RESCHEDULE',
  '4': 'CANCEL',

  yes: 'CONFIRM',
  ok: 'CONFIRM',
  okay: 'CONFIRM',
  confirmed: 'CONFIRM',
  coming: 'ON_THE_WAY',
  no: 'CANCEL',
};

const INCLUDES_RESPONSE_PATTERNS: Array<{
  needle: string;
  type: PatientResponseType;
}> = [
  { needle: 'on my way', type: 'ON_THE_WAY' },
  { needle: 'on the way', type: 'ON_THE_WAY' },
  { needle: 'on time', type: 'ON_THE_WAY' },
  { needle: 'running late', type: 'DELAY' },
  { needle: 'late by', type: 'DELAY' },
  { needle: 'cancel appointment', type: 'CANCEL' },
  { needle: 'reschedule', type: 'RESCHEDULE' },
  { needle: 'cancelled', type: 'CANCEL' },
  { needle: 'canceled', type: 'CANCEL' },
  { needle: 'cancel', type: 'CANCEL' },
  { needle: 'delayed', type: 'DELAY' },
  { needle: 'late', type: 'DELAY' },
  { needle: 'confirm', type: 'CONFIRM' },
];

type AppointmentContext = {
  id: string;
  startTime: Date;
  patient: { firstName: string; lastName: string; phoneNumber: string };
  doctor: { id: string; name: string };
  clinic: { id: string; name: string };
};

type DelayContext = {
  delayMinutes: number | null;
  delayMinutesPending: boolean;
  conflictDetected: boolean;
  nextAppointmentTime: Date | null;
};

@Injectable()
export class ResponseHandlerService {
  private readonly logger = new Logger(ResponseHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappClient: WhatsappClientService,
    private readonly templatesService: TemplatesService,
    private readonly staffNotification: StaffNotificationService,
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

    const appointment = await this.prisma.appointment.findUnique({
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

    const responseType = this.parseResponse(responseText);
    const delayMinutes = this.extractDelayMinutes(responseText);
    const pendingDelayResponse =
      await this.findPendingDelayResponse(appointmentId);

    if (
      pendingDelayResponse &&
      delayMinutes !== null &&
      (responseType === 'UNKNOWN' || responseType === 'DELAY')
    ) {
      await this.handleDelayMinutesFollowUp(
        appointment as AppointmentContext,
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

    const response = await this.prisma.appointmentResponse.create({
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

    await this.sendPatientConfirmation(
      appointment as AppointmentContext,
      responseType,
      {
        delayMinutes,
        delayMinutesPending,
        conflictDetected,
        nextAppointmentTime,
      },
    );

    await this.notifyStaff(
      appointment as AppointmentContext,
      responseType,
      responseText,
      response.id,
      {
        delayMinutes,
        delayMinutesPending,
        conflictDetected,
        nextAppointmentTime,
      },
    );

    this.logger.log(
      `Response processed: ${responseType} for appointment ${appointmentId}`,
    );
  }

  private parseResponse(text: string): PatientResponseType {
    const normalized = text.toLowerCase().trim();

    if (EXACT_RESPONSE_MAPPING[normalized]) {
      return EXACT_RESPONSE_MAPPING[normalized];
    }

    for (const pattern of INCLUDES_RESPONSE_PATTERNS) {
      if (normalized.includes(pattern.needle)) {
        return pattern.type;
      }
    }

    return 'UNKNOWN';
  }

  private extractDelayMinutes(text: string): number | null {
    const normalized = text.toLowerCase().trim();

    const patterns = [
      /^(\d{1,3})$/i,
      /(?:^|\s)(\d{1,3})\s*min(?:ute)?s?(?:\s|$)/i,
      /running\s*(\d{1,3})\s*late/i,
      /late\s*by\s*(\d{1,3})/i,
      /(?:^|\s)(\d{1,3})\s*(?:mins?)\s*late/i,
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (!match?.[1]) {
        continue;
      }

      const minutes = parseInt(match[1], 10);
      if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240) {
        return null;
      }
      return minutes;
    }

    return null;
  }

  private async findPendingDelayResponse(
    appointmentId: string,
  ): Promise<{ id: string } | null> {
    const windowStart = new Date(
      Date.now() - DELAY_FOLLOW_UP_WINDOW_HOURS * 60 * 60 * 1000,
    );

    const pending = await this.prisma.appointmentResponse.findFirst({
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

    await this.prisma.appointmentResponse.update({
      where: { id: responseId },
      data: {
        delayMinutes,
        patientMessage: responseText,
        notes: conflict.conflictDetected
          ? 'delay_minutes_confirmed_conflict'
          : 'delay_minutes_confirmed',
      },
    });

    await this.sendDelayMinutesConfirmation(
      appointment,
      delayMinutes,
      conflict.conflictDetected,
    );

    await this.notifyStaff(appointment, 'DELAY', responseText, responseId, {
      delayMinutes,
      delayMinutesPending: false,
      conflictDetected: conflict.conflictDetected,
      nextAppointmentTime: conflict.nextAppointmentTime,
    });
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

    const nextAppointment = await this.prisma.appointment.findFirst({
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
    let newStatus: AppointmentStatus | null = null;

    switch (responseType) {
      case 'CONFIRM':
      case 'ON_THE_WAY':
        newStatus = AppointmentStatus.CONFIRMED;
        break;
      case 'CANCEL':
        newStatus = AppointmentStatus.CANCELLED;
        break;
      case 'RESCHEDULE':
        newStatus = AppointmentStatus.RESCHEDULING;
        break;
      case 'DELAY':
        break;
    }

    if (newStatus) {
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: newStatus },
      });
    }
  }

  private async sendPatientConfirmation(
    appointment: AppointmentContext,
    responseType: PatientResponseType,
    delayContext: DelayContext,
  ): Promise<void> {
    let templateId: string;
    const variables = {
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      clinicName: appointment.clinic.name,
      date: formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM, {
        timezone: DEFAULT_TIMEZONE,
      }),
      time: formatTime(appointment.startTime, 'h:mm a', {
        timezone: DEFAULT_TIMEZONE,
      }),
      doctorName: appointment.doctor.name,
      delayMinutes:
        delayContext.delayMinutes !== null
          ? String(delayContext.delayMinutes)
          : '',
    };

    switch (responseType) {
      case 'CONFIRM':
      case 'ON_THE_WAY':
        templateId = 'patient_response_confirm';
        break;
      case 'DELAY': {
        if (delayContext.delayMinutesPending) {
          await this.whatsappClient.sendMessage({
            to: appointment.patient.phoneNumber,
            message: `*Delay Update* - ${appointment.clinic.name}\n\nThanks ${appointment.patient.firstName}. Please reply with your expected delay in minutes (example: 15).`,
          });
          return;
        }

        if (delayContext.conflictDetected) {
          await this.whatsappClient.sendMessage({
            to: appointment.patient.phoneNumber,
            message: `*Schedule Impact* - ${appointment.clinic.name}\n\nThanks for the update. This delay may affect the doctor's schedule. Please contact the clinic to reschedule or confirm a revised slot.`,
          });
          return;
        }

        templateId = 'patient_response_delay';
        break;
      }
      case 'RESCHEDULE':
        await this.whatsappClient.sendMessage({
          to: appointment.patient.phoneNumber,
          message: `*Reschedule Request* - ${appointment.clinic.name}\n\nThank you ${appointment.patient.firstName}. Our staff will contact you shortly to reschedule your appointment.\n\nFor urgent queries, please call us directly.`,
        });
        return;
      case 'CANCEL':
        await this.whatsappClient.sendMessage({
          to: appointment.patient.phoneNumber,
          message: `*Appointment Cancelled* - ${appointment.clinic.name}\n\nYour appointment on ${variables.date} at ${variables.time} has been cancelled.\n\nIf you'd like to book a new appointment, please contact us or visit our website.`,
        });
        return;
      default:
        await this.whatsappClient.sendMessage({
          to: appointment.patient.phoneNumber,
          message: `Thank you for your message. Our staff at ${appointment.clinic.name} will get back to you shortly.`,
        });
        return;
    }

    const resolved = await this.templatesService.resolveTemplate(
      templateId,
      variables,
      appointment.clinic.id,
    );

    if (resolved) {
      const message = this.templatesService.getMessageForMode(resolved);
      await this.whatsappClient.sendMessage({
        to: appointment.patient.phoneNumber,
        message,
      });
    }
  }

  private async sendDelayMinutesConfirmation(
    appointment: AppointmentContext,
    delayMinutes: number,
    conflictDetected: boolean,
  ): Promise<void> {
    if (conflictDetected) {
      await this.whatsappClient.sendMessage({
        to: appointment.patient.phoneNumber,
        message: `*Schedule Impact* - ${appointment.clinic.name}\n\nNoted: ${delayMinutes} minutes delay. This may affect the doctor's schedule. Please contact the clinic to reschedule or confirm a revised slot.`,
      });
      return;
    }

    await this.whatsappClient.sendMessage({
      to: appointment.patient.phoneNumber,
      message: `*Delay Noted* - ${appointment.clinic.name}\n\nThanks for the update. We have noted your ${delayMinutes} minute delay and informed the clinic team.`,
    });
  }

  private async notifyStaff(
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
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
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

    await this.prisma.appointmentResponse.update({
      where: { id: responseId },
      data: {
        staffNotified: true,
        staffNotifiedAt: new Date(),
      },
    });
  }

  private getResponseLabel(
    responseType: PatientResponseType,
    delayContext: DelayContext,
  ): string {
    if (responseType === 'DELAY') {
      if (delayContext.delayMinutesPending) {
        return 'Delayed (minutes pending)';
      }

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
    return labels[responseType as Exclude<PatientResponseType, 'DELAY'>];
  }

  private getNotificationPriority(
    responseType: PatientResponseType,
    delayContext: DelayContext,
  ): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
    if (responseType === 'DELAY') {
      if (delayContext.conflictDetected) {
        return 'HIGH';
      }

      if (delayContext.delayMinutesPending) {
        return 'HIGH';
      }

      return 'NORMAL';
    }

    switch (responseType) {
      case 'CANCEL':
        return 'HIGH';
      case 'RESCHEDULE':
        return 'HIGH';
      case 'CONFIRM':
      case 'ON_THE_WAY':
        return 'LOW';
      default:
        return 'NORMAL';
    }
  }

  private getStaffNotificationType(
    responseType: PatientResponseType,
  ): 'PATIENT_RESPONSE' | 'APPOINTMENT_CANCEL' | 'APPOINTMENT_DELAY' {
    switch (responseType) {
      case 'CANCEL':
        return 'APPOINTMENT_CANCEL';
      case 'DELAY':
        return 'APPOINTMENT_DELAY';
      default:
        return 'PATIENT_RESPONSE';
    }
  }
}
