import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
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

const RESPONSE_MAPPING: Record<string, string> = {
  btn_confirm: 'CONFIRM',
  btn_on_the_way: 'ON_THE_WAY',
  btn_delay: 'DELAY',
  btn_reschedule: 'RESCHEDULE',
  btn_cancel: 'CANCEL',

  confirm: 'CONFIRM',
  on_the_way: 'ON_THE_WAY',
  delay: 'DELAY',

  '1': 'CONFIRM',
  '2': 'DELAY',
  '3': 'RESCHEDULE',
  '4': 'CANCEL',

  yes: 'CONFIRM',
  ok: 'CONFIRM',
  okay: 'CONFIRM',
  confirmed: 'CONFIRM',
  coming: 'ON_THE_WAY',
  'on my way': 'ON_THE_WAY',
  'on the way': 'ON_THE_WAY',
  late: 'DELAY',
  'running late': 'DELAY',
  delayed: 'DELAY',
  reschedule: 'RESCHEDULE',
  cancel: 'CANCEL',
  'cancel appointment': 'CANCEL',
  no: 'CANCEL',
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
    phoneNumber: string,
    messageSid: string,
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

    const response = await this.prisma.appointmentResponse.create({
      data: {
        appointmentId,
        responseType,
        patientMessage: responseText,
        delayMinutes,
      },
    });

    await this.updateAppointmentStatus(appointment.id, responseType);

    await this.sendPatientConfirmation(appointment, responseType);

    await this.notifyStaff(
      appointment,
      responseType,
      responseText,
      response.id,
    );

    this.logger.log(
      `Response processed: ${responseType} for appointment ${appointmentId}`,
    );
  }

  private parseResponse(text: string): PatientResponseType {
    const normalized = text.toLowerCase().trim();

    if (RESPONSE_MAPPING[normalized]) {
      return RESPONSE_MAPPING[normalized] as PatientResponseType;
    }

    for (const [keyword, type] of Object.entries(RESPONSE_MAPPING)) {
      if (normalized.includes(keyword)) {
        return type as PatientResponseType;
      }
    }

    return 'UNKNOWN';
  }

  private extractDelayMinutes(text: string): number | null {
    const normalized = text.toLowerCase();

    const patterns = [
      /(\d+)\s*min/i,
      /(\d+)\s*mins/i,
      /running\s*(\d+)\s*late/i,
      /late\s*by\s*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    if (this.parseResponse(text) === 'DELAY') {
      return 15;
    }

    return null;
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
    appointment: {
      id: string;
      startTime: Date;
      patient: { firstName: string; lastName: string; phoneNumber: string };
      doctor: { name: string };
      clinic: { id: string; name: string };
    },
    responseType: PatientResponseType,
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
    };

    switch (responseType) {
      case 'CONFIRM':
      case 'ON_THE_WAY':
        templateId = 'patient_response_confirm';
        break;
      case 'DELAY':
        templateId = 'patient_response_delay';
        break;
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

  private async notifyStaff(
    appointment: {
      id: string;
      startTime: Date;
      patient: { firstName: string; lastName: string };
      doctor: { id: string; name: string };
      clinic: { id: string; name: string };
    },
    responseType: PatientResponseType,
    originalMessage: string,
    responseId: string,
  ): Promise<void> {
    const variables = {
      clinicName: appointment.clinic.name,
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      date: formatDate(appointment.startTime, DATE_FORMATS.DATE_MEDIUM, {
        timezone: DEFAULT_TIMEZONE,
      }),
      time: formatTime(appointment.startTime, 'h:mm a', {
        timezone: DEFAULT_TIMEZONE,
      }),
      responseType: this.getResponseLabel(responseType),
      message: originalMessage,
    };

    const priority = this.getNotificationPriority(responseType);

    await this.staffNotification.notifyStaff({
      clinicId: appointment.clinic.id,
      doctorId: appointment.doctor.id,
      type: this.getStaffNotificationType(responseType),
      title: `Patient Response: ${this.getResponseLabel(responseType)}`,
      message: `${variables.patientName} responded "${this.getResponseLabel(responseType)}" for appointment at ${variables.time}`,
      data: {
        appointmentId: appointment.id,
        responseId,
        responseType,
        patientName: variables.patientName,
        appointmentTime: variables.time,
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

  private getResponseLabel(responseType: PatientResponseType): string {
    const labels: Record<PatientResponseType, string> = {
      CONFIRM: 'Confirmed',
      ON_THE_WAY: 'On the way',
      DELAY: 'Running late',
      RESCHEDULE: 'Wants to reschedule',
      CANCEL: 'Cancelled',
      UNKNOWN: 'Unknown response',
    };
    return labels[responseType] || responseType;
  }

  private getNotificationPriority(
    responseType: PatientResponseType,
  ): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
    switch (responseType) {
      case 'CANCEL':
        return 'HIGH';
      case 'RESCHEDULE':
        return 'HIGH';
      case 'DELAY':
        return 'NORMAL';
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
