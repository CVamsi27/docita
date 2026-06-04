import { CLOCK_PORT, type IClock } from '../shared/common/ports/clock.port';

export function createFixedClockMock(iso = '2026-01-15T12:00:00.000Z'): IClock {
  const fixed = new Date(iso);
  return { now: () => new Date(fixed.getTime()) };
}

export function createMutableClockMock(): IClock {
  return { now: () => new Date() };
}

export function clockPortTestProvider(clock?: IClock) {
  return {
    provide: CLOCK_PORT,
    useValue: clock ?? createFixedClockMock(),
  };
}
