import { describe, expect, it, jest } from '@jest/globals';
import { AppointmentMetricsService } from './appointment-metrics.service';
import type { AppointmentPersistencePort } from '@/domains/appointments/application/ports/appointment-persistence.port';
import type { AppointmentMetricDefinitionService } from './appointment-metric-definition.service';
import type { RecordAppointmentVitalsUseCase } from '@/domains/appointments/application/use-cases/record-appointment-vitals.use-case';

function makeCtx(definitionMap: Map<string, string>) {
  const create = jest.fn((args: { data: unknown }) => ({ op: args }));
  const $transaction = jest.fn(async (ops: unknown[]) => ops);
  const persistence = {
    patientMetricRecord: { create },
    $transaction,
  };
  const metricDefinitionService = {
    ensureMetricDefinitions: jest.fn(async () => definitionMap),
  };
  const recordVitalsUseCase = {
    execute: jest.fn<RecordAppointmentVitalsUseCase['execute']>(),
  };
  const service = new AppointmentMetricsService(
    persistence as unknown as AppointmentPersistencePort,
    metricDefinitionService as unknown as AppointmentMetricDefinitionService,
    recordVitalsUseCase as unknown as RecordAppointmentVitalsUseCase,
  );
  return { service, create, $transaction, recordVitalsUseCase };
}

const baseInput = {
  clinicId: 'clinic-1',
  patientId: 'patient-1',
  appointmentId: 'appt-1',
};

describe('AppointmentMetricsService.recordObservationMetrics', () => {
  it('persists one metric record per resolved definition in a single transaction', async () => {
    const ctx = makeCtx(
      new Map([
        ['observations', 'def-obs'],
        ['consultation_notes', 'def-notes'],
      ]),
    );

    await ctx.service.recordObservationMetrics({
      ...baseInput,
      metrics: [
        {
          definitionKey: 'observations',
          definitionLabel: 'Observations',
          value: 'BP normal',
        },
        {
          definitionKey: 'consultation_notes',
          definitionLabel: 'Consultation Notes',
          value: 'Follow up 1w',
        },
      ],
    });

    expect(ctx.create).toHaveBeenCalledTimes(2);
    expect(ctx.$transaction).toHaveBeenCalledTimes(1);
  });

  it('silently skips a metric whose definition could not be resolved', async () => {
    const ctx = makeCtx(new Map([['observations', 'def-obs']]));

    await ctx.service.recordObservationMetrics({
      ...baseInput,
      metrics: [
        {
          definitionKey: 'observations',
          definitionLabel: 'Observations',
          value: 'BP normal',
        },
        {
          definitionKey: 'unmapped_key',
          definitionLabel: 'Unmapped',
          value: 'ignored',
        },
      ],
    });

    expect(ctx.create).toHaveBeenCalledTimes(1);
    expect(ctx.$transaction).toHaveBeenCalledTimes(1);
  });

  it('does not open a transaction when nothing resolves', async () => {
    const ctx = makeCtx(new Map());

    await ctx.service.recordObservationMetrics({
      ...baseInput,
      metrics: [
        { definitionKey: 'observations', definitionLabel: 'Obs', value: 'x' },
      ],
    });

    expect(ctx.create).not.toHaveBeenCalled();
    expect(ctx.$transaction).not.toHaveBeenCalled();
  });

  it('looks up definitions case-insensitively (trimmed + lowercased)', async () => {
    const ctx = makeCtx(new Map([['observations', 'def-obs']]));

    await ctx.service.recordObservationMetrics({
      ...baseInput,
      metrics: [
        {
          definitionKey: '  Observations ',
          definitionLabel: 'Observations',
          value: 'BP normal',
        },
      ],
    });

    expect(ctx.create).toHaveBeenCalledTimes(1);
  });
});

describe('AppointmentMetricsService vitals delegation', () => {
  it('createVitals delegates to the record-vitals use case', async () => {
    const ctx = makeCtx(new Map());

    await ctx.service.createVitals('appt-1', 'clinic-1', { weight: 70 });

    expect(ctx.recordVitalsUseCase.execute).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      clinicId: 'clinic-1',
      data: { weight: 70 },
      accessContext: undefined,
    });
  });

  it('updateVitals routes through the same record-vitals path', async () => {
    const ctx = makeCtx(new Map());

    await ctx.service.updateVitals('appt-1', 'clinic-1', { weight: 80 });

    expect(ctx.recordVitalsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ data: { weight: 80 } }),
    );
  });
});
