import { FeedbackStatus, FeedbackCategory } from '@workspace/db';
import { buildFeedbackWhereClause } from './feedback-helpers';

describe('buildFeedbackWhereClause', () => {
  it('returns empty object for empty filters', () => {
    expect(buildFeedbackWhereClause({})).toEqual({});
  });

  it('filters by status', () => {
    const result = buildFeedbackWhereClause({ status: FeedbackStatus.NEW });
    expect(result.status).toBe(FeedbackStatus.NEW);
  });

  it('filters by category', () => {
    const result = buildFeedbackWhereClause({
      category: FeedbackCategory.GENERAL,
    });
    expect(result.category).toBe(FeedbackCategory.GENERAL);
  });

  it('filters by clinicId', () => {
    const result = buildFeedbackWhereClause({ clinicId: 'clinic-1' });
    expect(result.clinicId).toBe('clinic-1');
  });

  it('filters by minRating only', () => {
    const result = buildFeedbackWhereClause({ minRating: 3 });
    expect(result.overallRating).toEqual({ gte: 3 });
  });

  it('filters by maxRating only', () => {
    const result = buildFeedbackWhereClause({ maxRating: 5 });
    expect(result.overallRating).toEqual({ lte: 5 });
  });

  it('filters by both minRating and maxRating', () => {
    const result = buildFeedbackWhereClause({ minRating: 2, maxRating: 4 });
    expect(result.overallRating).toEqual({ gte: 2, lte: 4 });
  });

  it('filters by startDate only', () => {
    const result = buildFeedbackWhereClause({ startDate: '2026-01-01' });
    expect(result.createdAt).toBeDefined();
    expect((result.createdAt as Record<string, unknown>).gte).toBeInstanceOf(
      Date,
    );
  });

  it('filters by endDate only', () => {
    const result = buildFeedbackWhereClause({ endDate: '2026-12-31' });
    expect(result.createdAt).toBeDefined();
    expect((result.createdAt as Record<string, unknown>).lte).toBeInstanceOf(
      Date,
    );
  });

  it('filters by both startDate and endDate', () => {
    const result = buildFeedbackWhereClause({
      startDate: '2026-01-01',
      endDate: '2026-06-30',
    });
    const createdAt = result.createdAt as Record<string, unknown>;
    expect(createdAt.gte).toBeInstanceOf(Date);
    expect(createdAt.lte).toBeInstanceOf(Date);
  });

  it('filters by search term across multiple fields', () => {
    const result = buildFeedbackWhereClause({ search: 'bug report' });
    expect(result.OR).toBeDefined();
    expect(Array.isArray(result.OR)).toBe(true);
    expect(result.OR!.length).toBe(5);
    for (const clause of result.OR!) {
      const clauseRecord = clause as Record<string, unknown>;
      const field = Object.keys(clauseRecord)[0];
      expect(clauseRecord[field]).toHaveProperty('contains', 'bug report');
      expect(clauseRecord[field]).toHaveProperty('mode', 'insensitive');
    }
  });

  it('combines multiple filters', () => {
    const result = buildFeedbackWhereClause({
      status: FeedbackStatus.NEW,
      category: FeedbackCategory.GENERAL,
      clinicId: 'clinic-1',
      minRating: 1,
      maxRating: 5,
    });
    expect(result.status).toBe(FeedbackStatus.NEW);
    expect(result.category).toBe(FeedbackCategory.GENERAL);
    expect(result.clinicId).toBe('clinic-1');
    expect(result.overallRating).toEqual({ gte: 1, lte: 5 });
  });

  it('does not add rating filter when both are undefined', () => {
    const result = buildFeedbackWhereClause({});
    expect(result.overallRating).toBeUndefined();
  });

  it('does not add date filter when both are empty', () => {
    const result = buildFeedbackWhereClause({});
    expect(result.createdAt).toBeUndefined();
  });

  it('does not add search filter when search is empty', () => {
    const result = buildFeedbackWhereClause({});
    expect(result.OR).toBeUndefined();
  });
});
