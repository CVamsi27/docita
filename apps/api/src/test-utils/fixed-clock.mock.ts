import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';

/** Fixed clock for unit tests that inject {@link CLOCK_PORT}. */
export function createFixedClockMock(
  iso = '2026-01-15T12:00:00.000Z',
): IClock {
  const fixed = new Date(iso);
  return { now: () => new Date(fixed.getTime()) };
}

/** Real-time clock — use with {@link jest.useFakeTimers} when tests control "now". */
export function createMutableClockMock(): IClock {
  return { now: () => new Date() };
}

/** Nest testing provider for {@link CLOCK_PORT}. */
export function clockPortTestProvider(clock?: IClock) {
  return {
    provide: CLOCK_PORT,
    useValue: clock ?? createFixedClockMock(),
  };
}
