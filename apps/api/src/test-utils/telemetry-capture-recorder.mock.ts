/**
 * Test double for TelemetryCaptureRecorder.
 *
 * Lives in test-utils rather than beside the service because it is only ever
 * imported from specs, and the capture recorder's real behaviour (retaining
 * events while the DB is down) is not what a consumer spec needs to exercise.
 */

import { jest } from '@jest/globals';
import type { TelemetryCoverage } from '@workspace/types';

export interface TelemetryCaptureRecorderStub {
  recordDisabled: jest.Mock<
    (reason: string, dropped: number, buffered: number) => Promise<void>
  >;
  recordTruncated: jest.Mock<
    (reason: string, dropped: number, buffered: number) => Promise<void>
  >;
  recordRecovered: jest.Mock<(reason: string) => Promise<void>>;
  flushPending: jest.Mock<() => Promise<void>>;
  getCoverage: jest.Mock<
    (windowStart: Date, windowEnd: Date) => Promise<TelemetryCoverage>
  >;
}

export function createTelemetryCaptureRecorderStub(): TelemetryCaptureRecorderStub {
  return {
    recordDisabled: jest.fn(async () => undefined),
    recordTruncated: jest.fn(async () => undefined),
    recordRecovered: jest.fn(async () => undefined),
    flushPending: jest.fn(async () => undefined),
    getCoverage: jest.fn(async () => {
      throw new Error('getCoverage not stubbed for this spec');
    }),
  };
}
