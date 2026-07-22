import { type UpdateAppointmentRequest } from '@workspace/types';

/**
 * Domain rule: turn a `UpdateAppointmentRequest` patch into the
 * observation/consultation-notes metric records the post-commit
 * fan-out will persist. Pure — no DI, no I/O — so the metric shape
 * can be unit-tested in isolation and reused by any caller that
 * wants the same observations/notes → metric mapping.
 */

export type AppointmentObservationMetric = {
  definitionKey: string;
  definitionLabel: string;
  value: string;
};

export function buildAppointmentObservationMetrics(
  data: Partial<UpdateAppointmentRequest>,
): AppointmentObservationMetric[] {
  const observations =
    typeof data.observations === 'string' ? data.observations.trim() : '';
  const consultationNotes =
    typeof data.consultationNotes === 'string'
      ? data.consultationNotes.trim()
      : '';

  const metrics: AppointmentObservationMetric[] = [];
  if (observations) {
    metrics.push({
      definitionKey: 'observations',
      definitionLabel: 'Observations',
      value: observations,
    });
  }
  if (consultationNotes) {
    metrics.push({
      definitionKey: 'consultation_notes',
      definitionLabel: 'Consultation Notes',
      value: consultationNotes,
    });
  }
  return metrics;
}
