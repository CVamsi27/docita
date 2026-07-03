import { describe, expect, it } from '@jest/globals';
import { getTodayRange } from './queue-token.helpers';

describe('queue-token.helpers', () => {
  it('getTodayRange uses clinic timezone day bounds', () => {
    const clock = {
      now: () => new Date('2026-04-01T12:00:00.000Z'),
    };

    const { today, tomorrow } = getTodayRange(clock, 'Asia/Kolkata');

    expect(today.toISOString()).toBe('2026-03-31T18:30:00.000Z');
    expect(tomorrow.toISOString()).toBe('2026-04-01T18:30:00.000Z');
  });
});
