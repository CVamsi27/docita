import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { TemplatesService } from '@/domains/whatsapp/application/services/templates.service';
import { type PatientResponseType } from '@/domains/whatsapp/application/policies/patient-response.policy';
import type {
  AppointmentContext,
  DelayContext,
} from './patient-response.types';
import { resolvePatientConfirmationPlan } from './patient-response-confirmation.handlers';
import { buildAppointmentResponseBasics } from './patient-response-template-formatting.helper';

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
    const variables: Record<string, string> = {
      ...buildAppointmentResponseBasics(appointment),
      clinicName: appointment.clinic.name,
      doctorName: appointment.doctor.name,
      delayMinutes:
        delayContext.delayMinutes !== null
          ? String(delayContext.delayMinutes)
          : '',
    };

    const plan = resolvePatientConfirmationPlan(
      responseType,
      appointment,
      delayContext,
      variables,
    );

    if (plan.kind === 'plain_text') {
      await this.sendClinicPatientWhatsApp({
        clinicId: appointment.clinic.id,
        to: appointment.patient.phoneNumber,
        text: plan.text,
      });
      return;
    }

    const resolved = await this.templatesService.resolveTemplate(
      plan.templateId,
      variables,
      appointment.clinic.id,
    );

    if (resolved) {
      // Send only the variables this template actually uses. Meta requires the
      // number of body parameters to match the number of placeholders, and the
      // shared `variables` map carries extras (e.g. `delayMinutes` for non-delay
      // responses) that the confirm template does not reference.
      const templateVariables = this.pickTemplateVariables(
        plan.templateId,
        variables,
      );
      await this.sendClinicPatientWhatsApp({
        clinicId: appointment.clinic.id,
        to: appointment.patient.phoneNumber,
        templateName: plan.templateId,
        variables: templateVariables,
      });
    }
  }

  private pickTemplateVariables(
    templateId: string,
    variables: Record<string, string>,
  ): Record<string, string> {
    if (templateId === 'patient_response_confirm') {
      const { delayMinutes: _omit, ...rest } = variables;
      return rest;
    }
    return variables;
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
