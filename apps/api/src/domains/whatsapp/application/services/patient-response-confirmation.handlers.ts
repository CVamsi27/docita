import {
  PATIENT_CONFIRMATION_TEMPLATE_BY_RESPONSE,
  type PatientResponseType,
} from '@/domains/whatsapp/application/policies/patient-response.policy';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';
import type {
  AppointmentContext,
  DelayContext,
} from './patient-response.types';

export type PatientConfirmationPlan =
  | { kind: 'plain_text'; text: string }
  | { kind: 'template'; templateId: string };

type ConfirmationHandler = (input: {
  appointment: AppointmentContext;
  delayContext: DelayContext;
  variables: Record<string, string>;
}) => PatientConfirmationPlan;

const delayHandler: ConfirmationHandler = ({ appointment, delayContext }) => {
  if (delayContext.delayMinutesPending) {
    return {
      kind: 'plain_text',
      text: `*Delay Update* - ${appointment.clinic.name}\n\nThanks ${appointment.patient.firstName}. Please reply with your expected delay in minutes (example: 15).`,
    };
  }

  if (delayContext.conflictDetected) {
    return {
      kind: 'plain_text',
      text: `*Schedule Impact* - ${appointment.clinic.name}\n\nThanks for the update. This delay may affect the doctor's schedule. Please contact the clinic to reschedule or confirm a revised slot.`,
    };
  }

  return { kind: 'template', templateId: 'patient_response_delay' };
};

const templateFromPolicy =
  (responseType: PatientResponseType): ConfirmationHandler =>
  () => {
    const templateId = PATIENT_CONFIRMATION_TEMPLATE_BY_RESPONSE[responseType];
    if (!templateId) {
      throw new InvariantViolationError(
        `Missing confirmation template for ${responseType}`,
      );
    }
    return { kind: 'template', templateId };
  };

const PATIENT_CONFIRMATION_HANDLERS: Record<
  PatientResponseType,
  ConfirmationHandler
> = {
  DELAY: delayHandler,
  RESCHEDULE: ({ appointment }) => ({
    kind: 'plain_text',
    text: `*Reschedule Request* - ${appointment.clinic.name}\n\nThank you ${appointment.patient.firstName}. Our staff will contact you shortly to reschedule your appointment.\n\nFor urgent queries, please call us directly.`,
  }),
  CANCEL: ({ appointment, variables }) => ({
    kind: 'plain_text',
    text: `*Appointment Cancelled* - ${appointment.clinic.name}\n\nYour appointment on ${variables.date} at ${variables.time} has been cancelled.\n\nIf you'd like to book a new appointment, please contact us or visit our website.`,
  }),
  CONFIRM: templateFromPolicy('CONFIRM'),
  ON_THE_WAY: templateFromPolicy('ON_THE_WAY'),
  UNKNOWN: ({ appointment }) => {
    const templateId = PATIENT_CONFIRMATION_TEMPLATE_BY_RESPONSE.UNKNOWN;
    if (!templateId) {
      return {
        kind: 'plain_text',
        text: `Thank you for your message. Our staff at ${appointment.clinic.name} will get back to you shortly.`,
      };
    }
    return { kind: 'template', templateId };
  },
};

export function resolvePatientConfirmationPlan(
  responseType: PatientResponseType,
  appointment: AppointmentContext,
  delayContext: DelayContext,
  variables: Record<string, string>,
): PatientConfirmationPlan {
  return PATIENT_CONFIRMATION_HANDLERS[responseType]({
    appointment,
    delayContext,
    variables,
  });
}
