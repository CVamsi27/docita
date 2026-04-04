import { describe, expect, it } from '@jest/globals';
import {
  toAnalyticsPeriodKey,
  toTimeSeriesBucketKey,
} from './period-bucket.util';

describe('period-bucket util', () => {
  it('creates analytics period keys for daily and monthly periods', () => {
    const date = new Date('2025-03-18T10:15:00.000Z');

    expect(toAnalyticsPeriodKey(date, 'daily')).toBe('2025-03-18');
    expect(toAnalyticsPeriodKey(date, 'monthly')).toBe('2025-03');
  });

  it('creates analytics weekly key with legacy week format', () => {
    const date = new Date('2025-03-18T10:15:00.000Z');

    expect(toAnalyticsPeriodKey(date, 'weekly')).toBe('2025-W3');
  });

  it('creates time-series bucket keys by day/week/month', () => {
    const date = new Date('2025-03-18T10:15:00.000Z');

    expect(toTimeSeriesBucketKey(date, 'day')).toBe('2025-03-18');
    expect(toTimeSeriesBucketKey(date, 'week')).toBe('2025-03-16');
    expect(toTimeSeriesBucketKey(date, 'month')).toBe('2025-03');
  });
});
