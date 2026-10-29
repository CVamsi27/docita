import { InternalOperationalMetricsService } from './internal-operational-metrics.service';

describe('InternalOperationalMetricsService', () => {
  const end = new Date('2026-10-02T12:00:00Z');
  const snapshot = {
    requests: 0,
    errors: 0,
    p50Ms: null,
    p95Ms: null,
    p99Ms: null,
    validLatencySamples: 0,
    invalidLatencySamples: 0,
    firstSampleAt: null,
    lastSampleAt: null,
    clinicsWithAppointments: 0,
    appointments: 0,
    completedAppointments: 0,
    prescriptionsCreated: 0,
    clinicPatientsSeen: 0,
    invoices: 0,
    jobs: 0,
    failedJobs: 0,
  };
  it('uses an exact rolling 30-day window and leaves unsampled telemetry unavailable', async () => {
    const repository = { read: jest.fn().mockResolvedValue(snapshot) };
    const service = new InternalOperationalMetricsService(repository, {
      now: () => end,
    });
    const result = await service.getMetrics();
    expect(repository.read).toHaveBeenCalledWith(
      new Date('2026-09-02T12:00:00Z'),
      end,
    );
    expect(result.telemetry.errorRatePercent).toBeNull();
    expect(result.telemetry.p95Ms).toBeNull();
    expect(result.window.endExclusive).toBe(end.toISOString());
  });
  it('computes the error rate from retained request samples', async () => {
    const service = new InternalOperationalMetricsService(
      {
        read: jest.fn().mockResolvedValue({
          ...snapshot,
          requests: 200,
          errors: 3,
          p95Ms: 420,
        }),
      },
      { now: () => end },
    );
    expect((await service.getMetrics()).telemetry.errorRatePercent).toBe(1.5);
  });
  it('propagates database failure instead of returning healthy-looking zeros', async () => {
    const service = new InternalOperationalMetricsService(
      { read: jest.fn().mockRejectedValue(new Error('unavailable')) },
      { now: () => end },
    );
    await expect(service.getMetrics()).rejects.toThrow('unavailable');
  });

  it('identifies the corrected customer scope and preserves additive observations', async () => {
    const service = new InternalOperationalMetricsService(
      {
        read: jest.fn().mockResolvedValue({
          ...snapshot,
          requests: 6,
          errors: 2,
          p50Ms: 200,
          p95Ms: 470,
          p99Ms: 494,
          validLatencySamples: 3,
          invalidLatencySamples: 3,
          prescriptionsCreated: 2,
          clinicPatientsSeen: 3,
        }),
      },
      { now: () => end },
    );
    expect(await service.getMetrics()).toMatchObject({
      definitionVersion: 2,
      activity: { prescriptionsCreated: 2, clinicPatientsSeen: 3 },
      telemetry: {
        requestScope: 'CUSTOMER',
        samples: 6,
        serverErrors: 2,
        errorRatePercent: expect.closeTo(100 / 3, 12),
        p99Ms: 494,
        validLatencySamples: 3,
        invalidLatencySamples: 3,
      },
    });
  });
});
