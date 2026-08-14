import { describe, expect, it } from '@jest/globals';
import {
  buildScheduledDoses,
  chunkDoseDrafts,
  DOSE_INSERT_BATCH_SIZE,
  MAX_GENERATED_DOSES,
} from './medication-dose-schedule.rules';
import { parseDosesPerDay } from './medication-dose.rules';

describe('medication-dose-schedule.rules', () => {
  const baseInput = {
    startDate: new Date('2026-03-21T08:00:00.000Z'),
    durationDays: 7,
    medicationId: 'med-1',
    patientId: 'patient-1',
    clinicId: 'clinic-1',
    prescriptionId: 'rx-1',
  };

  it('schedules BID doses twice per day for seven days', () => {
    const { doses } = buildScheduledDoses({
      ...baseInput,
      dosesPerDay: parseDosesPerDay('BID', '')!,
    });

    expect(doses).toHaveLength(14);
  });

  it('schedules QOD as every other day', () => {
    const { doses } = buildScheduledDoses({
      ...baseInput,
      durationDays: 14,
      dosesPerDay: parseDosesPerDay('QOD', '')!,
    });

    expect(doses).toHaveLength(7);
    expect(doses[0]?.scheduledAt.getDate()).toBe(21);
    expect(doses[1]?.scheduledAt.getDate()).toBe(23);
  });

  it('schedules QWK as once per week', () => {
    const { doses } = buildScheduledDoses({
      ...baseInput,
      durationDays: 28,
      dosesPerDay: parseDosesPerDay('QWK', '')!,
    });

    expect(doses).toHaveLength(4);
    expect(doses.map((dose) => dose.scheduledAt.getDate())).toEqual([
      21, 28, 4, 11,
    ]);
  });

  it('truncates when generated doses exceed the safety cap', () => {
    const { doses, truncated } = buildScheduledDoses({
      ...baseInput,
      durationDays: 2000,
      dosesPerDay: 4,
    });

    expect(truncated).toBe(true);
    expect(doses).toHaveLength(MAX_GENERATED_DOSES);
  });

  it('chunks doses for batched inserts', () => {
    const batches = chunkDoseDrafts(
      Array.from({ length: 1200 }, (_, index) => index),
      DOSE_INSERT_BATCH_SIZE,
    );

    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(500);
    expect(batches[2]).toHaveLength(200);
  });
});
