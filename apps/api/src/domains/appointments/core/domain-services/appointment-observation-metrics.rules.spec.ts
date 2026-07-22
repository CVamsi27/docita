import { describe, expect, it } from '@jest/globals';
import { buildAppointmentObservationMetrics } from './appointment-observation-metrics.rules';

describe('buildAppointmentObservationMetrics', () => {
  it('returns an empty list when neither field is present', () => {
    expect(buildAppointmentObservationMetrics({})).toEqual([]);
  });

  it('returns an empty list when both fields are empty strings', () => {
    expect(
      buildAppointmentObservationMetrics({
        observations: '',
        consultationNotes: '',
      }),
    ).toEqual([]);
  });

  it('trims surrounding whitespace before deciding whether the field is set', () => {
    const result = buildAppointmentObservationMetrics({
      observations: '   ',
      consultationNotes: '  patient reported headaches  ',
    });
    expect(result).toEqual([
      {
        definitionKey: 'consultation_notes',
        definitionLabel: 'Consultation Notes',
        value: 'patient reported headaches',
      },
    ]);
  });

  it('returns observations and notes as separate metric records in stable order', () => {
    const result = buildAppointmentObservationMetrics({
      observations: 'Lungs clear',
      consultationNotes: 'Follow up in 2 weeks',
    });
    expect(result).toEqual([
      {
        definitionKey: 'observations',
        definitionLabel: 'Observations',
        value: 'Lungs clear',
      },
      {
        definitionKey: 'consultation_notes',
        definitionLabel: 'Consultation Notes',
        value: 'Follow up in 2 weeks',
      },
    ]);
  });

  it('ignores non-string values (defensive — payload type allows unknown)', () => {
    // Cast through `unknown` so we can probe runtime defensiveness without
    // fighting the type signature: the function is typed as Partial<…>
    // but the call below deliberately uses wrong shapes to confirm the
    // typeof-guards inside the implementation.
    const result = buildAppointmentObservationMetrics({
      observations: 42,
      consultationNotes: null,
    } as unknown as Parameters<typeof buildAppointmentObservationMetrics>[0]);
    expect(result).toEqual([]);
  });
});
