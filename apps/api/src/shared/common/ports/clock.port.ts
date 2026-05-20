/**
 * Injectable clock for deterministic time in services, repositories, and schedulers.
 * Tests register a fixed {@link IClock} implementation instead of mocking global Date.
 */
export interface IClock {
  now(): Date;
}

export const CLOCK_PORT = 'IClock';
