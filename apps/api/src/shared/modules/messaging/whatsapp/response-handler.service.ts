import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
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

// Define PatientResponseType locally since it's from the DB schema
type PatientResponseType =
  | 'CONFIRM'
  | 'ON_THE_WAY'
  | 'DELAY'
  | 'RESCHEDULE'
  | 'CANCEL'
  | 'UNKNOWN';

/**
 * Maps text/button responses to PatientResponseType
 */
const RESPONSE_MAPPING: Record<string, string> = {
  // Button IDs (prefix with btn_ to avoid conflicts)
  btn_confirm: 'CONFIRM',
  btn_on_the_way: 'ON_THE_WAY',
  btn_delay: 'DELAY',
  btn_reschedule: 'RESCHEDULE',
  btn_cancel: 'CANCEL',
  // Button IDs without prefix (for direct button responses)
  confirm: 'CONFIRM',
  on_the_way: 'ON_THE_WAY',
  delay: 'DELAY',
  // Text responses (numbers for sandbox mode)
  '1': 'CONFIRM', // First option usually confirm/on-the-way
  '2': 'DELAY', // Second option usually delay/reschedule
  '3': 'RESCHEDULE',
  '4': 'CANCEL',
  // Common text responses
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

/**
 * Service to handle patient responses to WhatsApp appointment reminders
 * Maps button clicks and text responses to actions, updates appointment,
 * and notifies staff.
 */
@Injectable()
export class ResponseHandlerService {
  private readonly logger = new Logger(ResponseHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappClient: WhatsappClientService,
    private readonly templatesService: TemplatesService,
    private readonly staffNotification: StaffNotificationService,
  ) {}

  /**
   * Handle an incoming patient response
   */
  async handlePatientResponse(
    appointmentId: string,
    responseText: string,
    phoneNumber: string,
    messageSid: string,
  ): Promise<void> {
    this.logger.log(
      `Processing response for appointment ${appointmentId}: ${responseText}`,
    );

    // Get appointment details
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

    // Parse the response type
    const responseType = this.parseResponse(responseText);
    const delayMinutes = this.extractDelayMinutes(responseText);

    // Create response record
    const response = await this.prisma.appointmentResponse.create({
      data: {
        appointmentId,
        responseType,
        patientMessage: responseText,
        delayMinutes,
      },
    });

    // Update appointment status based on response
    await this.updateAppointmentStatus(appointment.id, responseType);

    // Send confirmation message to patient
    await this.sendPatientConfirmation(appointment, responseType);

    // Notify staff (WhatsApp + In-app)
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

  /**
   * Parse response text to PatientResponseType
   */
  private parseResponse(text: string): PatientResponseType {
    const normalized = text.toLowerCase().trim();

    // Check exact matches first
    if (RESPONSE_MAPPING[normalized]) {
      return RESPONSE_MAPPING[normalized] as PatientResponseType;
    }

    // Check if text contains keywords
    for (const [keyword, type] of Object.entries(RESPONSE_MAPPING)) {
      if (normalized.includes(keyword)) {
        return type as PatientResponseType;
      }
    }

    // Default to UNKNOWN if can't parse
    return 'UNKNOWN';
  }

  /**
   * Extract delay minutes from response text
   */
  private extractDelayMinutes(text: string): number | null {
    const normalized = text.toLowerCase();

    // Check for specific delay patterns
    const patterns = [
      /(\d+)\s*min/i, // "15 min", "15 minutes"
      /(\d+)\s*mins/i,
      /running\s*(\d+)\s*late/i, // "running 10 late"
      /late\s*by\s*(\d+)/i, // "late by 15"
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    // Default delay estimates based on response
    if (this.parseResponse(text) === 'DELAY') {
      return 15; // Default 15 minutes delay
    }

    return null;
  }

  /**
   * Update appointment status based on patient response
   */
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
        // Keep current status, just note the delay
        break;
    }

    if (newStatus) {
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: newStatus },
      });
    }
  }

  /**
   * Send confirmation message to patient based on their response
   */
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
        // For reschedule, we'll send a custom message
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
        // Unknown response - acknowledge receipt
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

  /**
   * Notify clinic staff about patient response
   */
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

    // Determine notification priority
    const priority = this.getNotificationPriority(responseType);

    // Send staff notifications (WhatsApp + In-app)
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

    // Update response record to mark staff notified
    await this.prisma.appointmentResponse.update({
      where: { id: responseId },
      data: {
        staffNotified: true,
        staffNotifiedAt: new Date(),
      },
    });
  }

  /**
   * Get human-readable label for response type
   */
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

  /**
   * Get notification priority based on response type
   */
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

  /**
   * Get staff notification type based on response
   */
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
