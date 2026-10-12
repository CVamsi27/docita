import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { PoolSaturationHistoryService } from './pool-saturation-history.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import type { PoolSaturationSnapshot } from '@workspace/db';

function snapshot(
  overrides: Partial<PoolSaturationSnapshot> = {},
): PoolSaturationSnapshot {
  return {
    max: 15,
    total: 4,
    idle: 4,
    waiting: 0,
    saturated: false,
    queuedForMs: null,
    ...overrides,
  };
}

describe('PoolSaturationHistoryService', () => {
  let service: PoolSaturationHistoryService;
  let getPoolSaturation: jest.Mock<() => PoolSaturationSnapshot>;
  let emit: jest.Mock<(...args: unknown[]) => void>;
  let now: Date;

  const idle = snapshot();
  const saturated = (waiting: number, queuedForMs: number | null) =>
    snapshot({ total: 15, idle: 0, waiting, saturated: true, queuedForMs });

  /** Re-sample on a fresh init, advancing the clock by one interval each time. */
  const step = (value: PoolSaturationSnapshot) => {
    getPoolSaturation.mockReturnValue(value);
    service.onModuleDestroy();
    now = new Date(now.getTime() + 30_000);
    service.onModuleInit();
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    now = new Date('2026-10-05T00:00:00.000Z');
    getPoolSaturation = jest.fn<() => PoolSaturationSnapshot>(() => idle);

    const clock: IClock = { now: () => now };
    emit = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoolSaturationHistoryService,
        { provide: PrismaService, useValue: { getPoolSaturation } },
        { provide: EventEmitter2, useValue: { emit } },
        { provide: CLOCK_PORT, useValue: clock },
      ],
    }).compile();

    service = module.get(PoolSaturationHistoryService);
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  it('records a sample on init so the window is never empty', () => {
    service.onModuleInit();

    const history = service.getHistory();
    expect(history.sampleCount).toBe(1);
    expect(history.samples[0].at).toEqual(new Date('2026-10-05T00:00:00.000Z'));
    expect(history.windowMs).toBeNull();
  });

  it('summarises peaks, saturation counts and the sampled window', () => {
    service.onModuleInit();
    step(saturated(6, 812));
    step(snapshot({ total: 9, idle: 6 }));

    const history = service.getHistory();
    expect(history.sampleCount).toBe(3);
    expect(history.windowMs).toBe(60_000);
    expect(history.summary).toMatchObject({
      maxWaiting: 6,
      maxTotal: 15,
      maxQueuedForMs: 812,
      saturatedSamples: 1,
    });
  });

  it('measures the longest unbroken saturation run', () => {
    service.onModuleInit();
    step(saturated(2, 100));
    step(saturated(4, 250));
    step(idle);
    step(saturated(1, 90));

    const { summary } = service.getHistory();
    // Samples at :30 and :60 are one unbroken run, measured from the previous
    // unsaturated sample at :00 — two intervals, not one.
    expect(summary.longestSaturationRunMs).toBe(60_000);
    expect(summary.saturatedSamples).toBe(3);
  });

  it('reports no saturation run when the pool was never queued', () => {
    service.onModuleInit();
    step(snapshot({ total: 8 }));
    step(snapshot({ total: 3 }));

    expect(service.getHistory().summary).toMatchObject({
      saturatedSamples: 0,
      longestSaturationRunMs: 0,
    });
  });

  it('bounds retained samples and clears on request', () => {
    service.onModuleInit();
    for (let i = 0; i < 130; i += 1) step(snapshot({ total: 5 }));

    expect(service.getHistory().sampleCount).toBe(120);

    service.clearHistory();
    expect(service.getHistory().sampleCount).toBe(0);
  });

  it('keeps sampling on the interval without holding the process open', () => {
    service.onModuleInit();
    expect(service.getHistory().sampleCount).toBe(1);

    jest.advanceTimersByTime(30_000);
    expect(service.getHistory().sampleCount).toBe(2);

    jest.advanceTimersByTime(30_000);
    expect(service.getHistory().sampleCount).toBe(3);
  });

  it('survives a pool that cannot be sampled', () => {
    getPoolSaturation.mockImplementation(() => {
      throw new Error('pool gone');
    });

    expect(() => service.onModuleInit()).not.toThrow();
    expect(service.getHistory().sampleCount).toBe(0);
  });

  describe('sustained-saturation alerting', () => {
    let warn: jest.SpiedFunction<Logger['warn']>;

    beforeEach(() => {
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    /** One saturated sample with an explicit queue age. */
    const queued = (queuedForMs: number) =>
      snapshot({
        total: 15,
        idle: 0,
        waiting: 5,
        saturated: true,
        queuedForMs,
      });

    it('stays quiet while the queue is younger than the threshold', () => {
      service.onModuleInit();
      step(queued(0));
      step(queued(30_000));

      expect(warn).not.toHaveBeenCalled();
    });

    it('warns once when the queue passes the threshold', () => {
      service.onModuleInit();
      step(queued(0));
      step(queued(30_000));
      step(queued(60_000));

      const saturationWarnings = warn.mock.calls.filter((call) =>
        String(call[0]).includes('pool saturated'),
      );
      expect(saturationWarnings).toHaveLength(1);
      expect(String(saturationWarnings[0][0])).toContain(
        'saturated for 60000ms',
      );
      expect(String(saturationWarnings[0][0])).toContain('waiting=5');
    });

    it('does not repeat the warning while the pool stays saturated', () => {
      service.onModuleInit();
      for (const age of [0, 30_000, 60_000, 90_000, 120_000, 150_000]) {
        step(queued(age));
      }

      const saturationWarnings = warn.mock.calls.filter((call) =>
        String(call[0]).includes('pool saturated'),
      );
      expect(saturationWarnings).toHaveLength(1);
    });

    it('re-arms after the pool drains so the next episode is reported', () => {
      service.onModuleInit();
      step(queued(0));
      step(queued(30_000));
      step(queued(60_000)); // first episode alerts
      step(idle); // drains -> re-arms
      step(queued(0));
      step(queued(30_000));
      step(queued(60_000)); // second episode alerts again

      const saturationWarnings = warn.mock.calls.filter((call) =>
        String(call[0]).includes('pool saturated'),
      );
      expect(saturationWarnings).toHaveLength(2);
    });

    it('emits the ops alert event with the queue detail', () => {
      service.onModuleInit();
      step(queued(0));
      step(queued(30_000));
      step(queued(60_000));

      expect(emit).toHaveBeenCalledWith(
        ApplicationEvents.POOL_SATURATION_SUSTAINED,
        { queuedForMs: 60_000, waiting: 5, total: 15, max: 15 },
      );
    });

    it('emits exactly once per episode even as the queue persists', () => {
      service.onModuleInit();
      for (const age of [0, 30_000, 60_000, 90_000]) step(queued(age));

      const emissions = emit.mock.calls.filter(
        (call) => call[0] === ApplicationEvents.POOL_SATURATION_SUSTAINED,
      );
      expect(emissions).toHaveLength(1);
    });

    it('still logs when no alert webhook is configured', () => {
      // The event listener is a no-op without OPS_ALERT_WEBHOOK_URL, so the log
      // line is the only always-on signal for a saturated pool.
      service.onModuleInit();
      step(queued(0));
      step(queued(30_000));
      step(queued(60_000));

      const saturationWarnings = warn.mock.calls.filter((call) =>
        String(call[0]).includes('pool saturated'),
      );
      expect(saturationWarnings).toHaveLength(1);
    });
  });
});
