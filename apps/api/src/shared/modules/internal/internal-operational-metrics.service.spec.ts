import { InternalOperationalMetricsService } from './internal-operational-metrics.service';

describe('InternalOperationalMetricsService', () => {
  const end = new Date('2026-10-02T12:00:00Z');
  const snapshot = {
    requests: 0,
    errors: 0,
    p50Ms: null,
    p95Ms: null,
    firstSampleAt: null,
    lastSampleAt: null,
    clinicsWithAppointments: 0,
    appointments: 0,
    completedAppointments: 0,
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
});
