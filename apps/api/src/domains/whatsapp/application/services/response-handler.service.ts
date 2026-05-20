import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { TemplatesService } from '@/domains/whatsapp/application/services/templates.service';
import { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';
import { AppointmentStatus } from '@workspace/db';
import {
  formatDate,
  formatTime,
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
} from '@workspace/utils';
import {
  APPOINTMENT_STATUS_BY_PATIENT_RESPONSE,
  EXACT_RESPONSE_MAPPING,
  INCLUDES_RESPONSE_PATTERNS,
  PATIENT_CONFIRMATION_TEMPLATE_BY_RESPONSE,
  STAFF_NOTIFICATION_TYPE_BY_RESPONSE,
  STAFF_PRIORITY_BY_PATIENT_RESPONSE,
  type PatientResponseType,
} from '@/domains/whatsapp/application/policies/patient-response.policy';

const DELAY_MINUTES_PENDING_NOTE = 'delay_minutes_pending';
const DELAY_FOLLOW_UP_WINDOW_HOURS = 6;

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
    private readonly sendMessage: SendMessageUseCase,
    private readonly templatesService: TemplatesService,
    private readonly staffNotification: StaffNotificationService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private async sendClinicPatientWhatsApp(params: {
    clinicId: string;
    to: string;
    text?: string;
    templateName?: string;
    variables?: Record<string, string>;
  }): Promise<void> {
    try {
      await this.sendMessage.execute({
        clinicId: params.clinicId,
        recipientPhone: params.to,
        text: params.text,
        templateName: params.templateName,
        variables: params.variables ?? {},
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        this.logger.log(
          `Skipped outbound WhatsApp for clinic ${params.clinicId}: ${error.message}`,
        );
        return;
      }
      throw error;
    }
  }

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
    const now = this.clock.now();
    const windowStart = new Date(
      now.getTime() - DELAY_FOLLOW_UP_WINDOW_HOURS * 60 * 60 * 1000,
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
    const newStatus = APPOINTMENT_STATUS_BY_PATIENT_RESPONSE[responseType];

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
    const variables: Record<string, string> = {
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

    if (responseType === 'DELAY') {
        if (delayContext.delayMinutesPending) {
          await this.sendClinicPatientWhatsApp({
            clinicId: appointment.clinic.id,
            to: appointment.patient.phoneNumber,
            text: `*Delay Update* - ${appointment.clinic.name}\n\nThanks ${appointment.patient.firstName}. Please reply with your expected delay in minutes (example: 15).`,
          });
          return;
        }

        if (delayContext.conflictDetected) {
          await this.sendClinicPatientWhatsApp({
            clinicId: appointment.clinic.id,
            to: appointment.patient.phoneNumber,
            text: `*Schedule Impact* - ${appointment.clinic.name}\n\nThanks for the update. This delay may affect the doctor's schedule. Please contact the clinic to reschedule or confirm a revised slot.`,
          });
          return;
        }

        templateId = 'patient_response_delay';
    } else if (responseType === 'RESCHEDULE') {
        await this.sendClinicPatientWhatsApp({
          clinicId: appointment.clinic.id,
          to: appointment.patient.phoneNumber,
          text: `*Reschedule Request* - ${appointment.clinic.name}\n\nThank you ${appointment.patient.firstName}. Our staff will contact you shortly to reschedule your appointment.\n\nFor urgent queries, please call us directly.`,
        });
        return;
    } else if (responseType === 'CANCEL') {
        await this.sendClinicPatientWhatsApp({
          clinicId: appointment.clinic.id,
          to: appointment.patient.phoneNumber,
          text: `*Appointment Cancelled* - ${appointment.clinic.name}\n\nYour appointment on ${variables.date} at ${variables.time} has been cancelled.\n\nIf you'd like to book a new appointment, please contact us or visit our website.`,
        });
        return;
    } else {
      const mappedTemplate =
        PATIENT_CONFIRMATION_TEMPLATE_BY_RESPONSE[responseType];
      if (!mappedTemplate) {
        await this.sendClinicPatientWhatsApp({
          clinicId: appointment.clinic.id,
          to: appointment.patient.phoneNumber,
          text: `Thank you for your message. Our staff at ${appointment.clinic.name} will get back to you shortly.`,
        });
        return;
      }
      templateId = mappedTemplate;
    }

    const resolved = await this.templatesService.resolveTemplate(
      templateId,
      variables,
      appointment.clinic.id,
    );

    if (resolved) {
      await this.sendClinicPatientWhatsApp({
        clinicId: appointment.clinic.id,
        to: appointment.patient.phoneNumber,
        templateName: templateId,
        variables,
      });
    }
  }

  private async sendDelayMinutesConfirmation(
    appointment: AppointmentContext,
    delayMinutes: number,
    conflictDetected: boolean,
  ): Promise<void> {
    if (conflictDetected) {
      await this.sendClinicPatientWhatsApp({
        clinicId: appointment.clinic.id,
        to: appointment.patient.phoneNumber,
        text: `*Schedule Impact* - ${appointment.clinic.name}\n\nNoted: ${delayMinutes} minutes delay. This may affect the doctor's schedule. Please contact the clinic to reschedule or confirm a revised slot.`,
      });
      return;
    }

    await this.sendClinicPatientWhatsApp({
      clinicId: appointment.clinic.id,
      to: appointment.patient.phoneNumber,
      text: `*Delay Noted* - ${appointment.clinic.name}\n\nThanks for the update. We have noted your ${delayMinutes} minute delay and informed the clinic team.`,
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
        staffNotifiedAt: this.clock.now(),
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

    return STAFF_PRIORITY_BY_PATIENT_RESPONSE[responseType];
  }

  private getStaffNotificationType(
    responseType: PatientResponseType,
  ): 'PATIENT_RESPONSE' | 'APPOINTMENT_CANCEL' | 'APPOINTMENT_DELAY' {
    return STAFF_NOTIFICATION_TYPE_BY_RESPONSE[responseType];
  }
}
