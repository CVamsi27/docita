import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { TemplatesService } from '@/domains/whatsapp/application/services/templates.service';
import {
  PATIENT_CONFIRMATION_TEMPLATE_BY_RESPONSE,
  type PatientResponseType,
} from '@/domains/whatsapp/application/policies/patient-response.policy';
import {
  formatDate,
  formatTime,
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
} from '@workspace/utils';
import type {
  AppointmentContext,
  DelayContext,
} from './patient-response.types';

@Injectable()
export class PatientResponseConfirmationService {
  private readonly logger = new Logger(PatientResponseConfirmationService.name);

  constructor(
    private readonly sendMessage: SendMessageUseCase,
    private readonly templatesService: TemplatesService,
  ) {}

  async sendPatientConfirmation(
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

  async sendDelayMinutesConfirmation(
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
}
